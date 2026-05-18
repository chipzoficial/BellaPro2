import { Role, SubscriptionStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentMembership } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getStripeClient } from "@/lib/stripe";

function getAppUrl(request: Request) {
  return (
    process.env.APP_URL ||
    request.headers.get("origin") ||
    `${request.headers.get("x-forwarded-proto") ?? "http"}://${request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "localhost:3000"}`
  );
}

export async function POST(request: Request) {
  try {
    const stripe = getStripeClient();
    const membership = await getCurrentMembership([Role.OWNER]);
    const body = (await request.json()) as { planId?: string };

    if (!body.planId) {
      return NextResponse.json({ success: false, message: "Plano inválido." }, { status: 400 });
    }

    const [organization, plan, currentSubscription] = await Promise.all([
      db.organization.findUnique({
        where: { id: membership.organizationId },
      }),
      db.subscriptionPlan.findFirst({
        where: { id: body.planId, isActive: true },
      }),
      db.subscription.findFirst({
        where: {
          organizationId: membership.organizationId,
          status: {
            in: [SubscriptionStatus.TRIALING, SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE],
          },
        },
        orderBy: { currentPeriodEnd: "desc" },
      }),
    ]);

    if (!organization || !plan || !plan.stripePriceId) {
      return NextResponse.json({ success: false, message: "Plano não configurado para cobrança." }, { status: 400 });
    }

    if (currentSubscription?.stripeSubscriptionId) {
      return NextResponse.json(
        {
          success: false,
          message: "Já existe uma assinatura ativa ou pendente. Use o portal da cobrança para alterar o plano.",
        },
        { status: 400 }
      );
    }

    let stripeCustomerId = organization.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        name: organization.name,
        email: organization.email || undefined,
        metadata: {
          organizationId: organization.id,
        },
      });

      stripeCustomerId = customer.id;

      await db.organization.update({
        where: { id: organization.id },
        data: { stripeCustomerId },
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [
        {
          price: plan.stripePriceId,
          quantity: 1,
        },
      ],
      allow_promotion_codes: true,
      success_url: `${getAppUrl(request)}/app/assinatura?checkout=success`,
      cancel_url: `${getAppUrl(request)}/app/assinatura?checkout=cancelled`,
      metadata: {
        organizationId: organization.id,
        planId: plan.id,
      },
      subscription_data: {
        metadata: {
          organizationId: organization.id,
          planId: plan.id,
        },
      },
    });

    const pendingSubscription =
      currentSubscription && !currentSubscription.stripeSubscriptionId ? currentSubscription : null;

    if (pendingSubscription) {
      await db.subscription.update({
        where: { id: pendingSubscription.id },
        data: {
          planId: plan.id,
          checkoutSessionId: session.id,
          stripePriceId: plan.stripePriceId,
          status: SubscriptionStatus.TRIALING,
        },
      });
    } else {
      await db.subscription.create({
        data: {
          organizationId: organization.id,
          planId: plan.id,
          status: SubscriptionStatus.TRIALING,
          checkoutSessionId: session.id,
          stripePriceId: plan.stripePriceId,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(),
        },
      });
    }

    return NextResponse.json({ success: true, url: session.url });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Erro ao iniciar checkout.",
      },
      { status: 500 }
    );
  }
}
