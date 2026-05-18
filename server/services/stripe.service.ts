import Stripe from "stripe";

export class StripeService {
  getClient(): Stripe | null {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) return null;
    return new Stripe(key, { apiVersion: "2024-06-20" as any });
  }
}

export const stripeService = new StripeService();
