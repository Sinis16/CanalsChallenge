// src/errors/error-mapping.ts
//
// Maps domain errors to HTTP status codes + a consistent response shape.
// Used by the global Fastify error handler so individual routes don't need repeated try/catch blocks.

import { ZodError } from "zod";
import {
  InvalidOrderInputError,
  MissingFieldsError,
  InvalidAddressError,
  GeocodingTimeoutError,
  NoWarehouseAvailableError,
  InsufficientStockError,
  PaymentFailedError,
  InvalidAmountError,
  InvalidCardError,
} from "./domain-errors.js";

export interface ErrorResponse {
  statusCode: number;
  body: {
    error: string;
    message: string;
  };
}

export function mapErrorToResponse(error: unknown): ErrorResponse {
  if (error instanceof ZodError) {
    return {
      statusCode: 400,
      body: {
        error: "InvalidRequestBody",
        message: error.issues.map((i) => i.message).join("; "),
      },
    };
  }

  if (
    error instanceof InvalidOrderInputError ||
    error instanceof InvalidAmountError ||
    error instanceof InvalidCardError
  ) {
    return {
      statusCode: 400,
      body: { error: error.name, message: error.message },
    };
  }

  if (
    error instanceof MissingFieldsError ||
    error instanceof InvalidAddressError ||
    error instanceof GeocodingTimeoutError
  ) {
    return {
      statusCode: 422,
      body: { error: error.name, message: error.message },
    };
  }

  if (
    error instanceof NoWarehouseAvailableError ||
    error instanceof InsufficientStockError
  ) {
    return {
      statusCode: 409,
      body: { error: error.name, message: error.message },
    };
  }

  if (error instanceof PaymentFailedError) {
    return {
      statusCode: 402,
      body: { error: error.name, message: error.message },
    };
  }

  // Framework-level errors (e.g. Fastify's malformed-JSON-body error)
  // respect already carrying their own correct statusCode.
  if (
    error instanceof Error &&
    "statusCode" in error &&
    typeof (error as { statusCode: unknown }).statusCode === "number" &&
    (error as { statusCode: number }).statusCode < 500
  ) {
    const statusCode = (error as { statusCode: number }).statusCode;
    return {
      statusCode,
      body: { error: error.name, message: error.message },
    };
  }

  // Fallback: unanticipated error (bug, DB down, etc.)
  return {
    statusCode: 500,
    body: { error: "InternalServerError", message: "Something went wrong" },
  };
}
