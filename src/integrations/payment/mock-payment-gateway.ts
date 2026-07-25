// src/integrations/payment/mock-payment-gateway.ts
//
// Deterministic payment mock
//
// Rules:
//   1. amount <= 0                    -> throw InvalidAmountError
//   2. cardNumber not 16 digits       -> throw InvalidCardError
//   3. cardNumber === "0000000000000000" -> declined
//   4. anything else                  -> succeeded

import { randomUUID } from "node:crypto";
import type {
  PaymentGateway,
  ChargeInput,
  ChargeResult,
} from "./payment-gateway.interface.ts";
import {
  InvalidAmountError,
  InvalidCardError,
} from "../../errors/domain-errors.js";

const DECLINED_CARD = "0000000000000000";
const CARD_NUMBER_LENGTH = 16;

export class MockPaymentGateway implements PaymentGateway {
  async charge({
    cardNumber,
    amount,
    description,
  }: ChargeInput): Promise<ChargeResult> {
    if (amount <= 0) {
      throw new InvalidAmountError();
    }

    if (!/^\d+$/.test(cardNumber) || cardNumber.length !== CARD_NUMBER_LENGTH) {
      throw new InvalidCardError();
    }

    // description isn't validated further here — it's passed through
    void description;

    if (cardNumber === DECLINED_CARD) {
      return {
        success: false,
        status: "declined",
        reference: randomUUID(),
      };
    }

    return {
      success: true,
      status: "succeeded",
      reference: randomUUID(),
    };
  }
}
