import { SubscriptionStatus } from "@prisma/client";
import { db } from "@/lib/db";

const activeStatuses = [
  SubscriptionStatus.TRIALING,
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.PAST_DUE,
] as const;

export async function getBillingOverview(organizationId: string) {
  const [organization, plans, currentSubscription] = await Promise.all([
    db.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        email: true,
        stripeCustomerId: true,
      },
    }),
    db.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: [{ priceInCents: "asc" }, { createdAt: "asc" }],
    }),
    db.subscription.findFirst({
      where: {
        organizationId,
        status: { in: activeStatuses.slice() },
      },
      include: {
        plan: true,
      },
      orderBy: [{ currentPeriodEnd: "desc" }],
    }),
  ]);

  return {
    organization,
    plans,
    currentSubscription,
  };
}
