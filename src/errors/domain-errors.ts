// src/errors/domain-errors.ts
// Custom error classes for domain-level failures. These map to specific HTTP status codes at the route layer

export class InvalidAmountError extends Error {
  constructor(message = "Amount must be greater than zero") {
    super(message);
    this.name = "InvalidAmountError";
  }
}

export class InvalidCardError extends Error {
  constructor(message = "Card number must be exactly 16 digits") {
    super(message);
    this.name = "InvalidCardError";
  }
}

export class PaymentTimeoutError extends Error {
  constructor(message = "Payment provider did not respond in time") {
    super(message);
    this.name = "PaymentTimeoutError";
  }
}

export class MissingFieldsError extends Error {
  constructor(message = "One or more required fields are missing") {
    super(message);
    this.name = "MissingFieldsError";
  }
}

export class InvalidAddressError extends Error {
  constructor(message = "Address could not be resolved to a location") {
    super(message);
    this.name = "InvalidAddressError";
  }
}

export class GeocodingTimeoutError extends Error {
  constructor(message = "Geocoding provider did not respond in time") {
    super(message);
    this.name = "GeocodingTimeoutError";
  }
}

export class NoWarehouseAvailableError extends Error {
  constructor(message = "No warehouse has sufficient stock for this order") {
    super(message);
    this.name = "NoWarehouseAvailableError";
  }
}

export class InsufficientStockError extends Error {
  constructor(
    message = "Stock changed before the reservation could be completed",
  ) {
    super(message);
    this.name = "InsufficientStockError";
  }
}

export class PaymentFailedError extends Error {
  constructor(message = "Payment was declined") {
    super(message);
    this.name = "PaymentFailedError";
  }
}

export class InvalidOrderInputError extends Error {
  constructor(message = "Order input is invalid") {
    super(message);
    this.name = "InvalidOrderInputError";
  }
}
