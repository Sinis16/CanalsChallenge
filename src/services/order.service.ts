// src/services/order.service.ts
//
// Orchestrates the full order creation flow: validate -> geocode -> select warehouse -> reserve stock
// + create order (transaction 1) -> charge payment (external call, outside any transaction) -> finalize status + payment record,
// with compensation on failure (transaction 2).
//
// Dependencies (GeocodingService, PaymentGateway) are injected, not// imported directly.

import { withTransaction } from "../db/transactions.js";
import {
  createOrderWithItems,
  updateOrderStatus,
  findOrderById,
  type Order,
} from "../repositories/order.repository.js";
import {
  decrementStockBatch,
  releaseStockBatch,
  type OrderItemRequest,
} from "../repositories/warehouse-inventory.repository.js";
import { createPayment } from "../repositories/payment.repository.js";
import { findItemsByIds } from "../repositories/item.repository.js";
import { selectNearestEligibleWarehouse } from "./warehouse-selection.service.js";
import type { GeocodingService } from "../integrations/geocoding/geocoding-service.interface.js";
import type { PaymentGateway } from "../integrations/payment/payment-gateway.interface.js";
import {
  InvalidOrderInputError,
  InsufficientStockError,
  PaymentFailedError,
} from "../errors/domain-errors.js";

export interface CreateOrderRequest {
  customerId: string;
  shippingAddress: {
    address: string;
    city: string;
    country: string;
  };
  items: OrderItemRequest[]; // [{ itemId, quantity }]
  cardNumber: string;
}

export interface OrderServiceDeps {
  geocodingService: GeocodingService;
  paymentGateway: PaymentGateway;
}

export async function createOrder(
  input: CreateOrderRequest,
  deps: OrderServiceDeps,
): Promise<Order> {
  // Step 1: basic domain-level validation
  if (input.items.length === 0) {
    throw new InvalidOrderInputError("Order must include at least one item");
  }

  // Step 2: geocode the shipping address
  const location = await deps.geocodingService.geocode(input.shippingAddress);

  // Step 3: fetch current catalog prices for the requested items
  const itemIds = input.items.map((i) => i.itemId);
  const catalogItems = await findItemsByIds(itemIds);

  if (catalogItems.length !== itemIds.length) {
    throw new InvalidOrderInputError("One or more items do not exist");
  }

  const priceByItemId = new Map(catalogItems.map((i) => [i.id, i.unitCost]));

  // Step 4: select the nearest warehouse with sufficient stock
  const selectedWarehouse = await selectNearestEligibleWarehouse(
    input.items,
    location.lat,
    location.lng,
  );

  // Step 5: reservation transaction (stock decrement + order insert)
  const order = await withTransaction(async (client) => {
    const reservedItemIds = await decrementStockBatch(
      client,
      selectedWarehouse.warehouseId,
      input.items,
    );

    const allReserved = input.items.every((item) =>
      reservedItemIds.has(item.itemId),
    );

    if (!allReserved) {
      throw new InsufficientStockError();
    }

    return createOrderWithItems(client, {
      customerId: input.customerId,
      warehouseId: selectedWarehouse.warehouseId,
      shippingAddress: input.shippingAddress.address,
      lat: location.lat,
      lng: location.lng,
      items: input.items.map((item) => ({
        itemId: item.itemId,
        quantity: item.quantity,
        unitPrice: priceByItemId.get(item.itemId)!,
      })),
    });
  });

  // Step 6: compute total and call the external payment API
  const amount = input.items.reduce((total, item) => {
    const unitPrice = priceByItemId.get(item.itemId)!;
    return total + unitPrice * item.quantity;
  }, 0);

  const paymentResult = await deps.paymentGateway.charge({
    cardNumber: input.cardNumber,
    amount,
    description: `Order ${order.id}`,
  });

  // Step 7: finalize, separate transaction, with compensation on failure
  await withTransaction(async (client) => {
    if (paymentResult.success) {
      await updateOrderStatus(client, order.id, "paid");
      await createPayment(client, {
        orderId: order.id,
        amount,
        status: "succeeded",
        reference: paymentResult.reference,
      });
    } else {
      await updateOrderStatus(client, order.id, "failed");
      await createPayment(client, {
        orderId: order.id,
        amount,
        status: "declined",
        reference: paymentResult.reference,
      });
      await releaseStockBatch(
        client,
        selectedWarehouse.warehouseId,
        input.items,
      );
    }
  });

  if (!paymentResult.success) {
    throw new PaymentFailedError();
  }

  // Re-fetch to return the final, up-to-date state (status = 'paid').
  const finalOrder = await findOrderById(order.id);
  return finalOrder as Order; // guaranteed to exist — we just created/updated it
}
