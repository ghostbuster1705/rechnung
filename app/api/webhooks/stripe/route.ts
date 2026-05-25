import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe/server";

function planFromPrice(priceId?: string | null) {
  if (!priceId) return "FREE" as const;
  if (priceId === process.env.STRIPE_PRICE_BUSINESS_MONTHLY) return "BUSINESS" as const;
  if (priceId === process.env.STRIPE_PRICE_PRO_MONTHLY) return "PRO" as const;
  return "FREE" as const;
}

async function upsertSubscriptionFromStripe(subscription: Stripe.Subscription) {
  const customerId = String(subscription.customer);
  const firstItem = subscription.items.data[0];
  const plan = planFromPrice(firstItem?.price.id);
  const statusMap: Record<
    Stripe.Subscription.Status,
    "INCOMPLETE" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "TRIALING"
  > = {
    incomplete: "INCOMPLETE",
    incomplete_expired: "CANCELED",
    trialing: "TRIALING",
    active: "ACTIVE",
    past_due: "PAST_DUE",
    canceled: "CANCELED",
    unpaid: "PAST_DUE",
    paused: "PAST_DUE",
  };

  const existing = await prisma.subscription.findUnique({
    where: { stripeCustomerId: customerId },
  });

  if (!existing) {
    return;
  }

  const subscriptionRecord = subscription as unknown as Record<string, unknown>;
  const currentPeriodEndUnix =
    typeof subscriptionRecord.current_period_end === "number"
      ? subscriptionRecord.current_period_end
      : Math.floor(Date.now() / 1000);

  await prisma.subscription.update({
    where: { stripeCustomerId: customerId },
    data: {
      stripeSubscriptionId: subscription.id,
      plan,
      status: statusMap[subscription.status],
      currentPeriodEnd: new Date(currentPeriodEndUnix * 1000),
    },
  });

  await prisma.organization.update({
    where: { id: existing.orgId },
    data: {
      plan,
    },
  });
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Webhook-Signatur fehlt." }, { status: 400 });
  }

  const stripe = getStripe();
  const rawBody = await request.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Signatur ungültig.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(String(session.subscription));
          await upsertSubscriptionFromStripe(subscription);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await upsertSubscriptionFromStripe(subscription);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = String(subscription.customer);
        const existing = await prisma.subscription.findUnique({
          where: { stripeCustomerId: customerId },
        });

        if (existing) {
          await prisma.subscription.update({
            where: { stripeCustomerId: customerId },
            data: {
              status: "CANCELED",
              plan: "FREE",
            },
          });

          await prisma.organization.update({
            where: { id: existing.orgId },
            data: {
              plan: "FREE",
            },
          });
        }
        break;
      }
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: "Webhook-Verarbeitung fehlgeschlagen." }, { status: 500 });
  }
}
