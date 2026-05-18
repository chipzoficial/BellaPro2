import { SubscriptionStatus, type Prisma, type SubscriptionPlan } from "@prisma/client";
import { addDays } from "date-fns";
import { db } from "@/lib/db";

type DbLike = Prisma.TransactionClient | typeof db;

const defaultPlans = [
  {
    name: "Base",
    description: "Ideal para autônomos e salões em início de operação.",
    priceInCents: 3700,
    maxProfessionals: 5,
    maxAppointmentsPerMonth: 300,
    stripePriceId: "price_1TYFRzLs2IS9FRvLSNQSo9sb",
  },
  {
    name: "Studio",
    description: "Ideal para salões em crescimento com rotina intensa.",
    priceInCents: 6700,
    maxProfessionals: 10,
    maxAppointmentsPerMonth: 1000,
    stripePriceId: "price_1TYFx5Ls2IS9FRvLMmdLQA3d",
  },
  {
    name: "Elevate",
    description: "Ideal para operações maiores e equipes com alta demanda.",
    priceInCents: 14700,
    maxProfessionals: 20,
    maxAppointmentsPerMonth: null,
    stripePriceId: "price_1TYG3CLs2IS9FRvLFmPutOSf",
  },
] as const;

export async function ensureDefaultSubscriptionPlans(client: DbLike = db): Promise<SubscriptionPlan[]> {
  const plans = await Promise.all(
    defaultPlans.map(async (plan) => {
      const existingPlan = await client.subscriptionPlan.findFirst({
        where: { name: plan.name },
      });

      if (existingPlan) {
        return client.subscriptionPlan.update({
          where: { id: existingPlan.id },
          data: {
            description: plan.description,
            priceInCents: plan.priceInCents,
            maxProfessionals: plan.maxProfessionals,
            maxAppointmentsPerMonth: plan.maxAppointmentsPerMonth,
            stripePriceId: plan.stripePriceId,
            isActive: true,
          },
        });
      }

      return client.subscriptionPlan.create({
        data: {
          name: plan.name,
          description: plan.description,
          priceInCents: plan.priceInCents,
          maxProfessionals: plan.maxProfessionals,
          maxAppointmentsPerMonth: plan.maxAppointmentsPerMonth,
          stripePriceId: plan.stripePriceId,
          isActive: true,
        },
      });
    })
  );

  return plans.sort((a, b) => a.priceInCents - b.priceInCents);
}

export async function ensureTrialSubscriptionForOrganization(
  organizationId: string,
  client: DbLike = db
) {
  const subscriptionCount = await client.subscription.count({
    where: { organizationId },
  });

  if (subscriptionCount > 0) {
    return null;
  }

  const plans = await ensureDefaultSubscriptionPlans(client);
  const basePlan = plans.find((plan) => plan.name === "Base") ?? plans[0];

  if (!basePlan) {
    return null;
  }

  return client.subscription.create({
    data: {
      organizationId,
      planId: basePlan.id,
      status: SubscriptionStatus.TRIALING,
      currentPeriodStart: new Date(),
      currentPeriodEnd: addDays(new Date(), 14),
    },
    include: {
      plan: true,
    },
  });
}
