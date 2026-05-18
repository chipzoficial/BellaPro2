"use server";

import { Role, SubscriptionStatus, WeekDay } from "@prisma/client";
import { addDays } from "date-fns";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { clearSession, createSession, setActiveOrganization } from "@/lib/auth/session";
import { onboardingServiceCatalog } from "@/lib/onboarding";
import { registerSchema, loginSchema } from "@/lib/validations/auth";
import type { ActionState } from "@/types";

function fail(message: string, errors?: Record<string, string[] | undefined>): ActionState {
  return { success: false, message, errors };
}

export async function loginAction(input: unknown): Promise<ActionState> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return fail("Dados inválidos.", parsed.error.flatten().fieldErrors);

  const user = await db.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
    include: { memberships: true },
  });

  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return fail("E-mail ou senha inválidos.");
  }

  if (!user.isActive) return fail("Usuário inativo.");
  if (!user.memberships.length) return fail("Sua conta não possui acesso a nenhum salão.");

  await createSession({
    userId: user.id,
    activeOrganizationId: user.memberships.length === 1 ? user.memberships[0].organizationId : undefined,
  });

  return {
    success: true,
    message: user.memberships.length === 1 ? "/app" : "/selecionar-salao",
  };
}

export async function registerAction(input: unknown): Promise<ActionState> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return fail("Dados inválidos.", parsed.error.flatten().fieldErrors);

  const email = parsed.data.email.toLowerCase();
  const existingUser = await db.user.findUnique({ where: { email } });
  if (existingUser) return fail("Já existe uma conta com esse e-mail.");

  const existingOrganization = await db.organization.findUnique({ where: { slug: parsed.data.slug } });
  if (existingOrganization) return fail("Esse slug já está em uso.");

  const passwordHash = await hashPassword(parsed.data.password);
  const selectedServiceTemplates = onboardingServiceCatalog.filter((service) =>
    parsed.data.serviceKeys.includes(service.key)
  );

  const result = await db.$transaction(async (tx) => {
    const defaultPlan =
      (await tx.subscriptionPlan.findFirst({
        where: { name: "Base", isActive: true },
      })) ??
      (await tx.subscriptionPlan.findFirst({
        where: { isActive: true },
        orderBy: [{ priceInCents: "asc" }, { createdAt: "asc" }],
      }));

    const user = await tx.user.create({
      data: {
        name: parsed.data.name,
        email,
        phone: parsed.data.phone || null,
        passwordHash,
      },
    });

    const organization = await tx.organization.create({
      data: {
        name: parsed.data.salonName,
        slug: parsed.data.slug,
        phone: parsed.data.salonPhone || null,
        city: parsed.data.city,
        state: parsed.data.state,
        address: parsed.data.address || null,
      },
    });

    await tx.membership.create({
      data: {
        userId: user.id,
        organizationId: organization.id,
        role: Role.OWNER,
      },
    });

    if (defaultPlan) {
      await tx.subscription.create({
        data: {
          organizationId: organization.id,
          planId: defaultPlan.id,
          status: SubscriptionStatus.TRIALING,
          currentPeriodStart: new Date(),
          currentPeriodEnd: addDays(new Date(), 14),
        },
      });
    }

    const createdServices = await Promise.all(
      selectedServiceTemplates.map((service) =>
        tx.service.create({
          data: {
            organizationId: organization.id,
            name: service.name,
            description: service.description,
            durationMinutes: service.durationMinutes,
            priceInCents: service.priceInCents,
            isActive: true,
          },
        })
      )
    );

    const serviceIdByKey = Object.fromEntries(
      createdServices.map((service, index) => [selectedServiceTemplates[index].key, service.id])
    );

    const createdProfessionals = await Promise.all(
      parsed.data.professionals.map((professional) =>
        tx.professional.create({
          data: {
            organizationId: organization.id,
            name: professional.name,
            phone: professional.phone || null,
            email: professional.email || null,
            isActive: true,
          },
        })
      )
    );

    const professionalServices = parsed.data.professionals.flatMap((professional, index) =>
      professional.serviceKeys.map((serviceKey) => ({
        professionalId: createdProfessionals[index].id,
        serviceId: serviceIdByKey[serviceKey],
      }))
    );

    if (professionalServices.length) {
      await tx.professionalService.createMany({
        data: professionalServices,
      });
    }

    const weekDays = [
      WeekDay.MONDAY,
      WeekDay.TUESDAY,
      WeekDay.WEDNESDAY,
      WeekDay.THURSDAY,
      WeekDay.FRIDAY,
      WeekDay.SATURDAY,
    ];

    await tx.businessHour.createMany({
      data: weekDays.flatMap((weekDay) => [
        {
          organizationId: organization.id,
          weekDay,
          startTime: "09:00",
          endTime: "19:00",
          isActive: true,
        },
        ...createdProfessionals.map((professional) => ({
          organizationId: organization.id,
          professionalId: professional.id,
          weekDay,
          startTime: "09:00",
          endTime: "18:00",
          isActive: true,
        })),
      ]),
    });

    return { user, organization };
  });

  await createSession({
    userId: result.user.id,
    activeOrganizationId: result.organization.id,
  });

  return { success: true, message: "/app" };
}

export async function logoutAction() {
  await clearSession();
  redirect("/");
}

export async function chooseOrganizationAction(organizationId: string) {
  await setActiveOrganization(organizationId);
  redirect("/app");
}
