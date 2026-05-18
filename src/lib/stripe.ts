import Stripe from "stripe";

declare global {
  // eslint-disable-next-line no-var
  var stripe: Stripe | undefined;
}

function getStripeSecretKey() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY não configurada.");
  }

  return secretKey;
}

export function getStripeClient() {
  if (!global.stripe) {
    global.stripe = new Stripe(getStripeSecretKey(), {
      apiVersion: "2026-04-22.dahlia",
      appInfo: {
        name: "BellaPro",
      },
    });
  }

  return global.stripe;
}

export function getStripeWebhookSecret() {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET não configurada.");
  }

  return webhookSecret;
}
