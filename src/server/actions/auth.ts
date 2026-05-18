"use server";

import { AuthTokenType, Role, SubscriptionStatus, WeekDay } from "@prisma/client";
import { addDays } from "date-fns";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { clearSession, createSession, setActiveOrganization } from "@/lib/auth/session";
import { consumeAuthToken, createAuthToken, revokeAuthTokens } from "@/lib/auth-tokens";
import { sendPasswordResetEmail, sendVerificationEmail } from "@/lib/email";
import { onboardingServiceCatalog } from "@/lib/onboarding";
import { getAvailableOrganizationSlug } from "@/lib/organization-slug";
import { ensureDefaultSubscriptionPlans } from "@/lib/subscription-bootstrap";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/lib/validations/auth";
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
  const availableSlug = await getAvailableOrganizationSlug(parsed.data.slug);

  const passwordHash = await hashPassword(parsed.data.password);
  const selectedServiceTemplates = onboardingServiceCatalog.filter((service) =>
    parsed.data.serviceKeys.includes(service.key)
  );

  const result = await db.$transaction(async (tx) => {
    const defaultPlans = await ensureDefaultSubscriptionPlans(tx);
    const defaultPlan = defaultPlans.find((plan) => plan.name === "Base") ?? defaultPlans[0];

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
        slug: availableSlug,
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

  try {
    await revokeAuthTokens({
      userId: result.user.id,
      type: AuthTokenType.EMAIL_VERIFICATION,
    });

    const verificationToken = await createAuthToken({
      userId: result.user.id,
      type: AuthTokenType.EMAIL_VERIFICATION,
      expiresInHours: 24,
    });

    await sendVerificationEmail({
      to: result.user.email,
      name: result.user.name,
      token: verificationToken,
    });
  } catch (error) {
    console.error("Falha ao preparar envio de confirmação de e-mail:", error);
  }

  return { success: true, message: "/app" };
}

export async function requestPasswordResetAction(input: unknown): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return fail("Dados inválidos.", parsed.error.flatten().fieldErrors);

  const user = await db.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  });

  if (user) {
    try {
      await revokeAuthTokens({
        userId: user.id,
        type: AuthTokenType.PASSWORD_RESET,
      });

      const resetToken = await createAuthToken({
        userId: user.id,
        type: AuthTokenType.PASSWORD_RESET,
        expiresInHours: 1,
      });

      await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        token: resetToken,
      });
    } catch (error) {
      console.error("Falha ao preparar redefinição de senha:", error);
      return fail("Não foi possível enviar o e-mail de redefinição agora.");
    }
  }

  return {
    success: true,
    message: "Se esse e-mail existir no BellaPro, você receberá um link para redefinir a senha.",
  };
}

export async function resetPasswordAction(input: unknown): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return fail("Dados inválidos.", parsed.error.flatten().fieldErrors);

  const authToken = await consumeAuthToken({
    type: AuthTokenType.PASSWORD_RESET,
    token: parsed.data.token,
  });

  if (!authToken) {
    return fail("O link de redefinição é inválido ou expirou.");
  }

  try {
    const passwordHash = await hashPassword(parsed.data.password);

    await db.user.update({
      where: { id: authToken.userId },
      data: { passwordHash },
    });

    await revokeAuthTokens({
      userId: authToken.userId,
      type: AuthTokenType.PASSWORD_RESET,
    });

    return {
      success: true,
      message: "Senha redefinida com sucesso. Agora você já pode entrar.",
    };
  } catch (error) {
    console.error("Falha ao redefinir senha:", error);
    return fail("Não foi possível redefinir a senha.");
  }
}

export async function confirmEmailAction(token: string): Promise<ActionState> {
  if (!token) {
    return fail("Token de confirmação inválido.");
  }

  const authToken = await consumeAuthToken({
    type: AuthTokenType.EMAIL_VERIFICATION,
    token,
  });

  if (!authToken) {
    return fail("O link de confirmação é inválido ou expirou.");
  }

  try {
    await db.user.update({
      where: { id: authToken.userId },
      data: { emailVerifiedAt: new Date() },
    });

    await revokeAuthTokens({
      userId: authToken.userId,
      type: AuthTokenType.EMAIL_VERIFICATION,
    });

    return {
      success: true,
      message: "E-mail confirmado com sucesso.",
    };
  } catch (error) {
    console.error("Falha ao confirmar e-mail:", error);
    return fail("Não foi possível confirmar o e-mail.");
  }
}

export async function logoutAction() {
  await clearSession();
  redirect("/");
}

export async function chooseOrganizationAction(organizationId: string) {
  await setActiveOrganization(organizationId);
  redirect("/app");
}
