import { Prisma, SubscriptionStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { getStripeClient, getStripeWebhookSecret } from "@/lib/stripe";

function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case "trialing":
      return SubscriptionStatus.TRIALING;
    case "active":
      return SubscriptionStatus.ACTIVE;
    case "past_due":
      return SubscriptionStatus.PAST_DUE;
    case "canceled":
      return SubscriptionStatus.CANCELED;
    case "unpaid":
    case "incomplete":
    case "incomplete_expired":
    case "paused":
      return SubscriptionStatus.EXPIRED;
    default:
      return SubscriptionStatus.EXPIRED;
  }
}

async function handleSubscriptionEvent(subscription: Stripe.Subscription) {
  const metadataOrganizationId = subscription.metadata.organizationId;
  const metadataPlanId = subscription.metadata.planId;
  const stripePriceId = subscription.items.data[0]?.price.id ?? null;
  const currentPeriodStartUnix = subscription.items.data[0]?.current_period_start ?? subscription.start_date;
  const currentPeriodEndUnix =
    subscription.items.data[0]?.current_period_end ??
    subscription.cancel_at ??
    subscription.trial_end ??
    subscription.created;

  const organization =
    (metadataOrganizationId
      ? await db.organization.findUnique({
          where: { id: metadataOrganizationId },
        })
      : null) ??
    (subscription.customer
      ? await db.organization.findFirst({
          where: { stripeCustomerId: String(subscription.customer) },
        })
      : null);

  if (!organization) {
    throw new Error("Organização não encontrada para a assinatura Stripe.");
  }

  const plan =
    (metadataPlanId
      ? await db.subscriptionPlan.findUnique({
          where: { id: metadataPlanId },
        })
      : null) ??
    (stripePriceId
      ? await db.subscriptionPlan.findFirst({
          where: { stripePriceId },
        })
      : null);

  if (!plan) {
    throw new Error("Plano local não encontrado para a assinatura Stripe.");
  }

  await db.organization.update({
    where: { id: organization.id },
    data: {
      stripeCustomerId: String(subscription.customer),
    },
  });

  const existing = await db.subscription.findFirst({
    where: {
      OR: [
        { stripeSubscriptionId: subscription.id },
        { organizationId: organization.id, status: { in: [SubscriptionStatus.TRIALING, SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE] } },
      ],
    },
    orderBy: { updatedAt: "desc" },
  });

  if (existing) {
    await db.subscription.update({
      where: { id: existing.id },
      data: {
        organizationId: organization.id,
        planId: plan.id,
        stripeSubscriptionId: subscription.id,
        stripePriceId,
        status: mapStripeStatus(subscription.status),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        currentPeriodStart: new Date(currentPeriodStartUnix * 1000),
        currentPeriodEnd: new Date(currentPeriodEndUnix * 1000),
      },
    });
    return;
  }

  await db.subscription.create({
    data: {
      organizationId: organization.id,
      planId: plan.id,
      stripeSubscriptionId: subscription.id,
      stripePriceId,
      status: mapStripeStatus(subscription.status),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodStart: new Date(currentPeriodStartUnix * 1000),
      currentPeriodEnd: new Date(currentPeriodEndUnix * 1000),
    },
  });
}

function getOrganizationIdFromEventObject(event: Stripe.Event) {
  const objectWithMetadata = event.data.object as { metadata?: Record<string, string | undefined> };
  return objectWithMetadata.metadata?.organizationId || null;
}

export async function POST(request: Request) {
  const stripe = getStripeClient();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return new NextResponse("Assinatura Stripe ausente.", { status: 400 });
  }

  const rawBody = await request.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, getStripeWebhookSecret());
  } catch (error) {
    return new NextResponse(error instanceof Error ? error.message : "Webhook inválido.", { status: 400 });
  }

  const parsedPayload = JSON.parse(rawBody) as Prisma.InputJsonValue;

  const existingEvent = await db.stripeWebhookEvent.findUnique({
    where: { stripeEventId: event.id },
  });

  if (existingEvent) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      await handleSubscriptionEvent(event.data.object as Stripe.Subscription);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const organizationId = session.metadata?.organizationId ?? null;

      if (organizationId && session.customer) {
        await db.organization.update({
          where: { id: organizationId },
          data: {
            stripeCustomerId: String(session.customer),
          },
        });
      }

      if (session.subscription) {
        const pendingSubscription = await db.subscription.findFirst({
          where: {
            organizationId: organizationId ?? undefined,
            checkoutSessionId: session.id,
          },
          orderBy: { updatedAt: "desc" },
        });

        if (pendingSubscription) {
          await db.subscription.update({
            where: { id: pendingSubscription.id },
            data: {
              stripeSubscriptionId: String(session.subscription),
            },
          });
        }
      }
    }

    await db.stripeWebhookEvent.create({
      data: {
        stripeEventId: event.id,
        type: event.type,
        organizationId: getOrganizationIdFromEventObject(event) ?? undefined,
        payload: parsedPayload,
        processedAt: new Date(),
      },
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    return new NextResponse(error instanceof Error ? error.message : "Erro ao processar webhook.", { status: 500 });
  }
}
