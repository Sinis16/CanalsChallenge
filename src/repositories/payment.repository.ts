// src/repositories/payment.repository.ts
//
// Data access for payment attempts. Each row is an immutable record of one attempt against an order

import type { PoolClient } from "pg";
import { pool } from "../db/pool.js";

export type PaymentStatus = "succeeded" | "declined";

export interface CreatePaymentInput {
  orderId: string;
  amount: number;
  status: PaymentStatus;
  reference: string;
}

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  status: PaymentStatus;
  reference: string;
  createdAt: Date;
}

/**
 * Records a single payment attempt.
 */
export async function createPayment(
  client: PoolClient,
  input: CreatePaymentInput,
): Promise<Payment> {
  const result = await client.query<Payment>(
    `
    INSERT INTO payments (order_id, amount, status, reference)
    VALUES ($1, $2, $3, $4)
    RETURNING
      id,
      order_id AS "orderId",
      amount,
      status,
      reference,
      created_at AS "createdAt";
    `,
    [input.orderId, input.amount, input.status, input.reference],
  );

  const payment = result.rows[0];
  if (!payment) {
    throw new Error("Failed to insert payment — no row returned");
  }

  return payment;
}

/**
 * Returns the most recent payment attempt for an order, ordered by
 * created_at. Plain read.
 */
export async function findLatestPaymentByOrderId(
  orderId: string,
): Promise<Payment | null> {
  const result = await pool.query<Payment>(
    `
    SELECT
      id,
      order_id AS "orderId",
      amount,
      status,
      reference,
      created_at AS "createdAt"
    FROM payments
    WHERE order_id = $1
    ORDER BY created_at DESC
    LIMIT 1;
    `,
    [orderId],
  );

  return result.rows[0] ?? null;
}
