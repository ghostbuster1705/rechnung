import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { PLAN_CONFIG } from "@/lib/stripe/plans";

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const rawPlan = String(body.plan || "");
    const plan = rawPlan === "PRO" || rawPlan === "BUSINESS" ? rawPlan : null;

    if (!plan) {
      return NextResponse.json({ error: "Ungültiger Plan." }, { status: 400 });
    }

    const stripe = getStripe();
    const priceId = PLAN_CONFIG[plan].stripePriceId;

    if (!priceId) {
      return NextResponse.json(
        { error: "Stripe Price-ID fehlt in den Umgebungsvariablen." },
        { status: 500 },
      );
    }

    const org = await prisma.organization.findUniqueOrThrow({
      where: { id: session.user.organizationId },
      include: { subscription: true },
    });

    let customerId = org.subscription?.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: org.name,
        email: session.user.email || undefined,
        metadata: { orgId: org.id },
      });
      customerId = customer.id;

      await prisma.subscription.upsert({
        where: { orgId: org.id },
        create: {
          orgId: org.id,
          stripeCustomerId: customer.id,
          plan: "FREE",
          status: "INCOMPLETE",
        },
        update: {
          stripeCustomerId: customer.id,
        },
      });
    }

    const origin = request.headers.get("origin") || process.env.NEXTAUTH_URL || "http://localhost:3000";

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${origin}/settings?checkout=success`,
      cancel_url: `${origin}/settings?checkout=cancel`,
      metadata: {
        orgId: org.id,
        plan,
      },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
    }

    return NextResponse.json({ error: "Stripe Checkout konnte nicht gestartet werden." }, { status: 500 });
  }
}
