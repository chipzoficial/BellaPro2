import { AppointmentStatus, SubscriptionStatus } from "@prisma/client";
import { endOfMonth, startOfMonth } from "date-fns";
import { db } from "@/lib/db";

const allowedSubscriptionStatuses = [
  SubscriptionStatus.TRIALING,
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.PAST_DUE,
] as const;

async function getCurrentSubscriptionWithPlan(organizationId: string) {
  return db.subscription.findFirst({
    where: {
      organizationId,
      status: { in: allowedSubscriptionStatuses.slice() },
    },
    include: {
      plan: true,
    },
    orderBy: [{ currentPeriodEnd: "desc" }],
  });
}

export async function requireOperationalSubscription(organizationId: string) {
  const subscription = await getCurrentSubscriptionWithPlan(organizationId);

  if (!subscription) {
    throw new Error("Seu salão precisa de uma assinatura ativa para continuar operando.");
  }

  if (
    subscription.status !== SubscriptionStatus.TRIALING &&
    subscription.status !== SubscriptionStatus.ACTIVE &&
    subscription.status !== SubscriptionStatus.PAST_DUE
  ) {
    throw new Error("A assinatura do salão não permite novas operações no momento.");
  }

  return subscription;
}

export async function enforceProfessionalLimit(options: {
  organizationId: string;
  currentProfessionalId?: string;
}) {
  const subscription = await requireOperationalSubscription(options.organizationId);
  const maxProfessionals = subscription.plan.maxProfessionals;

  if (!maxProfessionals) {
    return subscription;
  }

  const activeProfessionals = await db.professional.count({
    where: {
      organizationId: options.organizationId,
      isActive: true,
      id: options.currentProfessionalId ? { not: options.currentProfessionalId } : undefined,
    },
  });

  if (activeProfessionals >= maxProfessionals) {
    throw new Error(`Seu plano ${subscription.plan.name} permite até ${maxProfessionals} profissionais ativos.`);
  }

  return subscription;
}

export async function enforceAppointmentLimit(options: {
  organizationId: string;
  startAt: Date;
  currentAppointmentId?: string;
}) {
  const subscription = await requireOperationalSubscription(options.organizationId);
  const maxAppointmentsPerMonth = subscription.plan.maxAppointmentsPerMonth;

  if (!maxAppointmentsPerMonth) {
    return subscription;
  }

  const appointmentCount = await db.appointment.count({
    where: {
      organizationId: options.organizationId,
      id: options.currentAppointmentId ? { not: options.currentAppointmentId } : undefined,
      status: { not: AppointmentStatus.CANCELED },
      startAt: {
        gte: startOfMonth(options.startAt),
        lte: endOfMonth(options.startAt),
      },
    },
  });

  if (appointmentCount >= maxAppointmentsPerMonth) {
    throw new Error(
      `Seu plano ${subscription.plan.name} permite até ${maxAppointmentsPerMonth} agendamentos por mês.`
    );
  }

  return subscription;
}
