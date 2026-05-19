import { Role, SubscriptionStatus } from "@prisma/client";
import { ensureDefaultSubscriptionPlans } from "@/lib/subscription-bootstrap";
import { db } from "@/lib/db";

const billableStatuses: SubscriptionStatus[] = [SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE];
const openStatuses: SubscriptionStatus[] = [SubscriptionStatus.TRIALING, SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE];

export async function getAdminOverview() {
  const [organizations, users, subscriptions, organizationsCount, activeOrganizationsCount] = await Promise.all([
    db.organization.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: {
        subscriptions: {
          include: {
            plan: true,
          },
          orderBy: [{ currentPeriodEnd: "desc" }, { createdAt: "desc" }],
          take: 1,
        },
        _count: {
          select: {
            professionals: true,
            clients: true,
            appointments: true,
          },
        },
      },
    }),
    db.user.count(),
    db.subscription.findMany({
      include: {
        plan: true,
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ currentPeriodEnd: "desc" }, { createdAt: "desc" }],
    }),
    db.organization.count(),
    db.organization.count({ where: { isActive: true } }),
  ]);

  return {
    metrics: {
      organizations: organizationsCount,
      activeOrganizations: activeOrganizationsCount,
      users,
      activeTrials: subscriptions.filter((item) => item.status === SubscriptionStatus.TRIALING).length,
      activeSubscriptions: subscriptions.filter((item) => item.status === SubscriptionStatus.ACTIVE).length,
      pastDueSubscriptions: subscriptions.filter((item) => item.status === SubscriptionStatus.PAST_DUE).length,
    },
    organizations,
    recentSubscriptions: subscriptions
      .filter((item) => openStatuses.includes(item.status))
      .slice(0, 6),
  };
}

export async function getAdminOrganizations() {
  return db.organization.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      subscriptions: {
        include: {
          plan: true,
        },
        orderBy: [{ currentPeriodEnd: "desc" }, { createdAt: "desc" }],
        take: 1,
      },
      _count: {
        select: {
          professionals: true,
          clients: true,
          appointments: true,
        },
      },
    },
  });
}

export async function getAdminUsers() {
  return db.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      memberships: {
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export async function getAdminPlans() {
  await ensureDefaultSubscriptionPlans();

  const plans = await db.subscriptionPlan.findMany({
    orderBy: [{ priceInCents: "asc" }, { createdAt: "asc" }],
    include: {
      subscriptions: {
        include: {
          organization: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  return plans.map((plan) => ({
    ...plan,
    subscriptionCount: plan.subscriptions.length,
    billableCount: plan.subscriptions.filter((item) => billableStatuses.includes(item.status)).length,
    trialCount: plan.subscriptions.filter((item) => item.status === SubscriptionStatus.TRIALING).length,
  }));
}

export function getRoleLabel(role: Role) {
  const labels: Record<Role, string> = {
    ADMIN_GLOBAL: "Admin global",
    OWNER: "Owner",
    MANAGER: "Gerente",
    PROFESSIONAL: "Profissional",
    RECEPTIONIST: "Recepção",
    CLIENT: "Cliente",
  };

  return labels[role];
}
