// Payment adapter registry — provider-agnostic order-completion pipeline.
// Adding a new gateway is drop-in: implement PaymentAdapter and register it.

import type { SupabaseClient } from "@supabase/supabase-js";

export type PaymentContext = {
  supabase: SupabaseClient;
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: string;
  customerEmail: string;
  returnUrl: string;
  cancelUrl: string;
  method: {
    id: string;
    code: string;
    provider: string;
    config: Record<string, any>;
    environment: string;
    instructions: string | null;
  };
};

export type PaymentResult =
  | { kind: "completed"; reference?: string } // payment succeeded immediately (COD confirmation, manual mark-paid)
  | { kind: "pending"; reference?: string; message?: string } // awaiting user action (bank transfer, admin confirmation)
  | { kind: "redirect"; url: string; reference?: string } // hosted checkout (Stripe, PayPal)
  | { kind: "failed"; error: string };

export interface PaymentAdapter {
  provider: string;
  initiate(ctx: PaymentContext): Promise<PaymentResult>;
}

// --- Built-in adapters ---------------------------------------------------

const codAdapter: PaymentAdapter = {
  provider: "cod",
  async initiate() {
    return { kind: "pending", message: "Pay in cash when your order arrives." };
  },
};

const bankTransferAdapter: PaymentAdapter = {
  provider: "bank_transfer",
  async initiate({ method, orderNumber }) {
    const instructions = method.instructions || method.config?.instructions || "";
    return {
      kind: "pending",
      reference: orderNumber,
      message: instructions
        ? `${instructions}\nReference this order number in your transfer: ${orderNumber}`
        : `Reference this order number in your transfer: ${orderNumber}`,
    };
  },
};

// Mock card gateway — production-shaped Payment Intent flow with no real
// network calls. Accepts card-shaped input (Luhn-validated), simulates a
// short auth delay, and returns a `completed` result with a fake txn ref.
// Swap for real Stripe by re-implementing this adapter.
function luhnValid(num: string) {
  const digits = num.replace(/\D/g, "").split("").reverse().map(Number);
  if (digits.length < 12) return false;
  let sum = 0;
  digits.forEach((d, i) => {
    if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  });
  return sum % 10 === 0;
}

const mockCardAdapter: PaymentAdapter = {
  provider: "mock_card",
  async initiate({ orderNumber, amount, currency, method }) {
    const card = (method.config?.__runtime_card ?? {}) as { number?: string; exp?: string; cvc?: string };
    // Well-known Stripe test triggers, so QA can simulate failures too.
    const num = (card.number ?? "").replace(/\s+/g, "");
    if (!num || !luhnValid(num)) {
      return { kind: "failed", error: "Invalid card number" };
    }
    if (num === "4000000000000002") return { kind: "failed", error: "Card declined (test)" };
    if (num === "4000000000009995") return { kind: "failed", error: "Insufficient funds (test)" };
    // Simulate provider auth latency
    await new Promise((r) => setTimeout(r, 400));
    const ref = `mock_${orderNumber}_${Date.now().toString(36)}`;
    console.info(`[mock_card] Authorized ${amount} ${currency} → ${ref}`);
    return { kind: "completed", reference: ref };
  },
};

const stripeAdapter: PaymentAdapter = {
  provider: "stripe",
  async initiate({ method }) {
    const hasKey = !!method.config?.publishable_key;
    if (!hasKey) {
      return {
        kind: "failed",
        error: "Stripe isn't configured yet. Add publishable + secret keys in Admin → Payments, or use the Test Card gateway.",
      };
    }
    return { kind: "pending", message: "Stripe hosted checkout will be initiated." };
  },
};

const paypalAdapter: PaymentAdapter = {
  provider: "paypal",
  async initiate({ method }) {
    if (!method.config?.client_id) {
      return { kind: "failed", error: "PayPal isn't configured yet. Add the client ID in Admin → Payments." };
    }
    return { kind: "pending", message: "PayPal checkout coming soon — the order is recorded." };
  },
};

const manualAdapter: PaymentAdapter = {
  provider: "manual",
  async initiate() {
    return { kind: "pending", message: "An administrator will contact you to complete payment." };
  },
};

const registry = new Map<string, PaymentAdapter>();
[codAdapter, bankTransferAdapter, mockCardAdapter, stripeAdapter, paypalAdapter, manualAdapter].forEach((a) => registry.set(a.provider, a));

export function registerPaymentAdapter(a: PaymentAdapter) { registry.set(a.provider, a); }
export function getPaymentAdapter(provider: string): PaymentAdapter {
  return registry.get(provider) ?? manualAdapter;
}

