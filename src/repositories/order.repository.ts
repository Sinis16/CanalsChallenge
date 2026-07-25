// src/repositories/order.repository.ts
//
// Data access for orders and their line items.

import type { PoolClient } from "pg";
import { pool } from "../db/pool.js";

export type OrderStatus = "pending" | "paid" | "failed";

export interface OrderItemInput {
  itemId: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateOrderInput {
  customerId: string;
  warehouseId: string;
  shippingAddress: string;
  lat: number;
  lng: number;
  items: OrderItemInput[];
}

export interface Order {
  id: string;
  customerId: string;
  warehouseId: string;
  shippingAddress: string;
  lat: number;
  lng: number;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Inserts an order (status = 'pending') and all of its order_items in
 * a single INSERT for the items, within an existing
 * transaction.
 */
export async function createOrderWithItems(
  client: PoolClient,
  input: CreateOrderInput,
): Promise<Order> {
  const orderResult = await client.query<Order>(
    `
    INSERT INTO orders (customer_id, warehouse_id, shipping_address, lat, lng, status)
    VALUES ($1, $2, $3, $4, $5, 'pending')
    RETURNING
      id,
      customer_id AS "customerId",
      warehouse_id AS "warehouseId",
      shipping_address AS "shippingAddress",
      lat,
      lng,
      status,
      created_at AS "createdAt",
      updated_at AS "updatedAt";
    `,
    [
      input.customerId,
      input.warehouseId,
      input.shippingAddress,
      input.lat,
      input.lng,
    ],
  );

  const order = orderResult.rows[0];
  if (!order) {
    throw new Error("Failed to insert order — no row returned");
  }

  // Insert for all order_items in one round-trip, using unnest() the same way we did for the stock decrement.
  const itemIds = input.items.map((i) => i.itemId);
  const quantities = input.items.map((i) => i.quantity);
  const unitPrices = input.items.map((i) => i.unitPrice);

  await client.query(
    `
    INSERT INTO order_items (order_id, item_id, quantity, unit_price)
    SELECT $1, item_id, quantity, unit_price
    FROM unnest($2::uuid[], $3::int[], $4::numeric[]) AS t(item_id, quantity, unit_price);
    `,
    [order.id, itemIds, quantities, unitPrices],
  );

  return order;
}

/**
 * Updates the order's status. Runs within the same transaction as the
 * payment result handling.
 */
export async function updateOrderStatus(
  client: PoolClient,
  orderId: string,
  status: OrderStatus,
): Promise<void> {
  await client.query(
    `UPDATE orders SET status = $1, updated_at = now() WHERE id = $2;`,
    [status, orderId],
  );
}

/**
 * Plain read, outside any transaction. Used to
 * return the final order state in the API response.
 */
export async function findOrderById(orderId: string): Promise<Order | null> {
  const result = await pool.query<Order>(
    `
    SELECT
      id,
      customer_id AS "customerId",
      warehouse_id AS "warehouseId",
      shipping_address AS "shippingAddress",
      lat,
      lng,
      status,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM orders
    WHERE id = $1;
    `,
    [orderId],
  );

  return result.rows[0] ?? null;
}
