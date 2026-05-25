export const PLAN_CONFIG = {
  FREE: {
    label: "Free",
    invoiceLimit: 5,
  },
  PRO: {
    label: "Pro",
    invoiceLimit: Number.POSITIVE_INFINITY,
    stripePriceId: process.env.STRIPE_PRICE_PRO_MONTHLY,
  },
  BUSINESS: {
    label: "Business",
    invoiceLimit: Number.POSITIVE_INFINITY,
    stripePriceId: process.env.STRIPE_PRICE_BUSINESS_MONTHLY,
  },
} as const;

export type PlanKey = keyof typeof PLAN_CONFIG;
