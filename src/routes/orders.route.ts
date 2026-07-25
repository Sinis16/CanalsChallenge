// src/routes/orders.route.ts
//
// HTTP layer for order creation. Parse/validate the
// request body, call the service, and return the result.

import type { FastifyInstance } from "fastify";
import { createOrderSchema } from "./orders.schema.js";
import { createOrder } from "../services/order.service.js";
import { MockGeocodingService } from "../integrations/geocoding/mock-geocoding-service.js";
import { MockPaymentGateway } from "../integrations/payment/mock-payment-gateway.js";

// Instantiated once, reused across requests, same idea as the DB pool.
const geocodingService = new MockGeocodingService();
const paymentGateway = new MockPaymentGateway();

export async function ordersRoute(app: FastifyInstance) {
  app.post("/orders", async (request, reply) => {
    // Zod validation happens here
    const parseResult = createOrderSchema.safeParse(request.body);

    if (!parseResult.success) {
      throw parseResult.error; // ZodError handled
    }

    const body = parseResult.data;

    const order = await createOrder(
      {
        customerId: body.customerId,
        shippingAddress: body.shippingAddress,
        items: body.items,
        cardNumber: body.cardNumber,
      },
      { geocodingService, paymentGateway },
    );

    return reply.status(201).send(order);
  });
}
