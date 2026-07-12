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

const stripeAdapter: PaymentAdapter = {
  provider: "stripe",
  async initiate({ method }) {
    // The Lovable-managed Stripe checkout integration is enabled separately
    // through the payments--enable_stripe_payments tool. When active, the
    // frontend calls the generated /api/checkout endpoint. Until then we
    // gracefully fall back to pending so orders still capture.
    const hasKey = !!method.config?.publishable_key;
    if (!hasKey) {
      return {
        kind: "pending",
        message: "Stripe not fully configured yet — the order is recorded and can be captured manually.",
      };
    }
    return { kind: "pending", message: "Stripe checkout will be initiated from the order summary." };
  },
};

const paypalAdapter: PaymentAdapter = {
  provider: "paypal",
  async initiate() {
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
[codAdapter, bankTransferAdapter, stripeAdapter, paypalAdapter, manualAdapter].forEach((a) => registry.set(a.provider, a));

export function registerPaymentAdapter(a: PaymentAdapter) { registry.set(a.provider, a); }
export function getPaymentAdapter(provider: string): PaymentAdapter {
  return registry.get(provider) ?? manualAdapter;
}
