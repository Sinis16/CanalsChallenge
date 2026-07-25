// src/routes/orders.schema.ts
//
// Request body validation for POST /orders. Kept separate for reuse facilitation

import { z } from "zod";

export const createOrderSchema = z.object({
  customerId: z.string().uuid(),
  shippingAddress: z.object({
    address: z.string().min(1),
    city: z.string().min(1),
    country: z.string().min(1),
  }),
  items: z
    .array(
      z.object({
        itemId: z.string().uuid(),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1),
  cardNumber: z.string().min(1),
});

export type CreateOrderBody = z.infer<typeof createOrderSchema>;
