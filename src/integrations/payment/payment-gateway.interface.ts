// src/integrations/payment/payment-gateway.interface.ts
//
// Contract for  payment gateway implementation.

export interface ChargeInput {
  cardNumber: string;
  amount: number;
  description: string;
}

export interface ChargeResult {
  success: boolean;
  status: "succeeded" | "declined";
  reference: string;
}

export interface PaymentGateway {
  /**
   * Attempts to charge a card.
   *
   * Throws:
   *  - InvalidAmountError if amount <= 0
   *  - InvalidCardError if cardNumber is not exactly 16 digits
   *  - PaymentTimeoutError if the provider fails to respond (simulated)
   */
  charge(input: ChargeInput): Promise<ChargeResult>;
}
