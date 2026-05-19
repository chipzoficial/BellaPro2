"use server";

import { AppointmentStatus, Role } from "@prisma/client";
import { addMinutes } from "date-fns";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { enforceAppointmentLimit, enforceProfessionalLimit } from "@/lib/billing";
import { db } from "@/lib/db";
import { sendAppointmentStatusEmail, sendBookingReceivedEmail } from "@/lib/email";
import { getAvailableOrganizationSlug } from "@/lib/organization-slug";
import { canAccess } from "@/lib/permissions";
import { getAvailableSlots, buildStartDate } from "@/lib/availability";
import { getCurrentMembership } from "@/lib/auth/session";
import {
  appointmentSchema,
  blockedTimeSchema,
  clientSchema,
  organizationSchema,
  professionalSchema,
  publicBookingSchema,
  serviceSchema,
} from "@/lib/validations/entities";
import { passwordSchema, phoneSchema } from "@/lib/validations/common";
import type { ActionState } from "@/types";

function ok(message: string): ActionState {
  return { success: true, message };
}

function fail(message: string, errors?: Record<string, string[] | undefined>): ActionState {
  return { success: false, message, errors };
}

async function resolveAppointmentClient(params: {
  organizationId: string;
  clientId?: string;
  clientName: string;
  clientPhone?: string;
}) {
  const normalizedName = params.clientName.trim();
  const normalizedPhone = params.clientPhone?.trim() || null;

  if (params.clientId) {
    const existingById = await db.client.findFirst({
      where: {
        id: params.clientId,
        organizationId: params.organizationId,
      },
    });

    if (existingById) {
      return existingById.id;
    }
  }

  const existingClient = normalizedPhone
    ? await db.client.findFirst({
        where: {
          organizationId: params.organizationId,
          phone: normalizedPhone,
        },
      })
    : await db.client.findFirst({
          where: {
            organizationId: params.organizationId,
            name: {
              equals: normalizedName,
              mode: "insensitive",
            },
          },
        });

  if (existingClient) {
    const shouldUpdateName = existingClient.name !== normalizedName;
    const shouldUpdatePhone = !existingClient.phone && normalizedPhone;

    if (shouldUpdateName || shouldUpdatePhone) {
      await db.client.update({
        where: { id: existingClient.id },
        data: {
          name: normalizedName,
          phone: shouldUpdatePhone ? normalizedPhone : existingClient.phone,
        },
      });
    }

    return existingClient.id;
  }

  const newClient = await db.client.create({
    data: {
      organizationId: params.organizationId,
      name: normalizedName,
      phone: normalizedPhone,
    },
  });

  return newClient.id;
}

async function requireScope(resource: "clients" | "professionals" | "services" | "appointments" | "settings" | "financial") {
  const membership = await getCurrentMembership();

  const map = {
    clients: "clients",
    professionals: "professionals",
    services: "services",
    appointments: "appointments",
    settings: "settings",
    financial: "financial",
  } as const;

  if (!canAccess(map[resource], membership.role)) {
    throw new Error("Sem permissão para esta ação.");
  }

  return membership;
}

export async function upsertClient(input: unknown): Promise<ActionState> {
  try {
    const membership = await requireScope("clients");
    const parsed = clientSchema.safeParse(input);
    if (!parsed.success) return fail("Dados inválidos.", parsed.error.flatten().fieldErrors);

    const data = parsed.data;
    if (data.id) {
      await db.client.update({
        where: { id: data.id, organizationId: membership.organizationId },
        data: {
          name: data.name,
          phone: data.phone || null,
          email: data.email || null,
          notes: data.notes || null,
        },
      });
    } else {
      await db.client.create({
        data: {
          organizationId: membership.organizationId,
          name: data.name,
          phone: data.phone || null,
          email: data.email || null,
          notes: data.notes || null,
        },
      });
    }
    revalidatePath("/app/clientes");
    revalidatePath("/app/agendamentos");
    return ok("Cliente salvo com sucesso.");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Erro ao salvar cliente.");
  }
}

export async function deleteClient(id: string): Promise<ActionState> {
  try {
    const membership = await requireScope("clients");
    await db.client.delete({
      where: { id, organizationId: membership.organizationId },
    });
    revalidatePath("/app/clientes");
    return ok("Cliente removido com sucesso.");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Erro ao remover cliente.");
  }
}

export async function upsertProfessional(input: unknown): Promise<ActionState> {
  try {
    const membership = await requireScope("professionals");
    const parsed = professionalSchema.safeParse(input);
    if (!parsed.success) return fail("Dados inválidos.", parsed.error.flatten().fieldErrors);
    const data = parsed.data;

    const existingProfessional = data.id
      ? await db.professional.findFirst({
          where: { id: data.id, organizationId: membership.organizationId },
          select: { id: true, isActive: true },
        })
      : null;

    if (!data.id || data.isActive) {
      const shouldCheckLimit = !existingProfessional || !existingProfessional.isActive || !data.id;
      if (shouldCheckLimit) {
        await enforceProfessionalLimit({
          organizationId: membership.organizationId,
          currentProfessionalId: data.id,
        });
      }
    }

    const professional = data.id
      ? await db.professional.update({
          where: { id: data.id, organizationId: membership.organizationId },
          data: {
            name: data.name,
            phone: data.phone || null,
            email: data.email || null,
            bio: data.bio || null,
            isActive: data.isActive,
          },
        })
      : await db.professional.create({
          data: {
            organizationId: membership.organizationId,
            name: data.name,
            phone: data.phone || null,
            email: data.email || null,
            bio: data.bio || null,
            isActive: data.isActive,
          },
        });

    await db.professionalService.deleteMany({ where: { professionalId: professional.id } });
    if (data.serviceIds.length) {
      await db.professionalService.createMany({
        data: data.serviceIds.map((serviceId) => ({
          professionalId: professional.id,
          serviceId,
        })),
      });
    }

    revalidatePath("/app/profissionais");
    revalidatePath("/app/agenda");
    return ok("Profissional salvo com sucesso.");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Erro ao salvar profissional.");
  }
}

export async function toggleProfessionalStatus(id: string): Promise<ActionState> {
  try {
    const membership = await requireScope("professionals");
    const professional = await db.professional.findFirst({
      where: { id, organizationId: membership.organizationId },
    });
    if (!professional) return fail("Profissional não encontrado.");
    if (!professional.isActive) {
      await enforceProfessionalLimit({
        organizationId: membership.organizationId,
        currentProfessionalId: professional.id,
      });
    }
    await db.professional.update({
      where: { id },
      data: { isActive: !professional.isActive },
    });
    revalidatePath("/app/profissionais");
    revalidatePath("/app/agenda");
    return ok("Status do profissional atualizado.");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Erro ao atualizar profissional.");
  }
}

export async function upsertService(input: unknown): Promise<ActionState> {
  try {
    const membership = await requireScope("services");
    const parsed = serviceSchema.safeParse(input);
    if (!parsed.success) return fail("Dados inválidos.", parsed.error.flatten().fieldErrors);
    const data = parsed.data;

    const service = data.id
      ? await db.service.update({
          where: { id: data.id, organizationId: membership.organizationId },
          data: {
            name: data.name,
            description: data.description || null,
            durationMinutes: data.durationMinutes,
            priceInCents: data.priceInCents,
            isActive: data.isActive,
          },
        })
      : await db.service.create({
          data: {
            organizationId: membership.organizationId,
            name: data.name,
            description: data.description || null,
            durationMinutes: data.durationMinutes,
            priceInCents: data.priceInCents,
            isActive: data.isActive,
          },
        });

    await db.professionalService.deleteMany({ where: { serviceId: service.id } });
    if (data.professionalIds.length) {
      await db.professionalService.createMany({
        data: data.professionalIds.map((professionalId) => ({
          professionalId,
          serviceId: service.id,
        })),
      });
    }

    revalidatePath("/app/servicos");
    revalidatePath("/app/agenda");
    return ok("Serviço salvo com sucesso.");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Erro ao salvar serviço.");
  }
}

export async function toggleServiceStatus(id: string): Promise<ActionState> {
  try {
    const membership = await requireScope("services");
    const service = await db.service.findFirst({
      where: { id, organizationId: membership.organizationId },
    });
    if (!service) return fail("Serviço não encontrado.");
    await db.service.update({
      where: { id },
      data: { isActive: !service.isActive },
    });
    revalidatePath("/app/servicos");
    revalidatePath("/app/agenda");
    return ok("Status do serviço atualizado.");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Erro ao atualizar serviço.");
  }
}

export async function upsertAppointment(input: unknown): Promise<ActionState> {
  try {
    const membership = await requireScope("appointments");
    const parsed = appointmentSchema.safeParse(input);
    if (!parsed.success) return fail("Dados inválidos.", parsed.error.flatten().fieldErrors);
    const data = parsed.data;

    const service = await db.service.findFirst({
      where: { id: data.serviceId, organizationId: membership.organizationId, isActive: true },
    });
    const professional = await db.professional.findFirst({
      where: { id: data.professionalId, organizationId: membership.organizationId, isActive: true },
      include: {
        professionalServices: true,
      },
    });

    if (!service || !professional) return fail("Serviço ou profissional inválido.");
    if (!professional.professionalServices.some((item) => item.serviceId === service.id)) {
      return fail("Esse profissional não realiza o serviço selecionado.");
    }

    const startAt = new Date(data.startAt);
    if (startAt < new Date()) return fail("Não é possível agendar no passado.");

    await enforceAppointmentLimit({
      organizationId: membership.organizationId,
      startAt,
      currentAppointmentId: data.id,
    });

    const clientId = await resolveAppointmentClient({
      organizationId: membership.organizationId,
      clientId: data.clientId || undefined,
      clientName: data.clientName,
      clientPhone: data.clientPhone || undefined,
    });

    const endAt = addMinutes(startAt, service.durationMinutes);
    const conflict = await db.appointment.findFirst({
      where: {
        organizationId: membership.organizationId,
        professionalId: professional.id,
        id: data.id ? { not: data.id } : undefined,
        status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, AppointmentStatus.COMPLETED] },
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
    });
    if (conflict) return fail("Já existe um agendamento nesse horário.");

    if (data.id) {
      await db.appointment.update({
        where: { id: data.id, organizationId: membership.organizationId },
        data: {
          clientId,
          professionalId: professional.id,
          serviceId: service.id,
          startAt,
          endAt,
          status: data.status,
          notes: data.notes || null,
          priceInCents: service.priceInCents,
        },
      });
    } else {
      await db.appointment.create({
        data: {
          organizationId: membership.organizationId,
          clientId,
          professionalId: professional.id,
          serviceId: service.id,
          startAt,
          endAt,
          status: data.status,
          notes: data.notes || null,
          priceInCents: service.priceInCents,
        },
      });
    }

    revalidatePath("/app/agenda");
    revalidatePath("/app/agendamentos");
    revalidatePath("/app");
    return ok("Agendamento salvo com sucesso.");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Erro ao salvar agendamento.");
  }
}

export async function updateAppointmentStatus(id: string, status: AppointmentStatus): Promise<ActionState> {
  try {
    const membership = await requireScope("appointments");
    const appointment = await db.appointment.update({
      where: { id, organizationId: membership.organizationId },
      data: { status },
      include: {
        client: true,
        professional: true,
        service: true,
        organization: true,
      },
    });

    if (appointment.client.email) {
      await sendAppointmentStatusEmail({
        to: appointment.client.email,
        clientName: appointment.client.name,
        organizationName: appointment.organization.name,
        serviceName: appointment.service.name,
        professionalName: appointment.professional.name,
        startAt: appointment.startAt,
        status,
      });
    }

    revalidatePath("/app/agenda");
    revalidatePath("/app/agendamentos");
    revalidatePath("/app/financeiro");
    return ok("Status atualizado.");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Erro ao atualizar status.");
  }
}

export async function updateOrganization(input: unknown): Promise<ActionState> {
  try {
    const membership = await getCurrentMembership([Role.OWNER]);
    const parsed = organizationSchema.safeParse(input);
    if (!parsed.success) return fail("Dados inválidos.", parsed.error.flatten().fieldErrors);
    const availableSlug = await getAvailableOrganizationSlug(parsed.data.slug, {
      excludeOrganizationId: membership.organizationId,
    });

    await db.organization.update({
      where: { id: membership.organizationId },
      data: {
        name: parsed.data.name,
        slug: availableSlug,
        phone: parsed.data.phone || null,
        email: parsed.data.email || null,
        address: parsed.data.address || null,
        city: parsed.data.city || null,
        state: parsed.data.state || null,
      },
    });

    revalidatePath("/app/configuracoes");
    return ok(
      availableSlug === parsed.data.slug
        ? "Configurações atualizadas."
        : `Configurações atualizadas. O novo endereço da sua página ficou em /${availableSlug}.`
    );
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Erro ao atualizar salão.");
  }
}

export async function updateProfile(input: unknown): Promise<ActionState> {
  try {
    const membership = await getCurrentMembership();
    const schema = organizationSchema
      .pick({})
      .extend({
        name: organizationSchema.shape.name,
        phone: phoneSchema,
      });
    const parsed = schema.safeParse(input);
    if (!parsed.success) return fail("Dados inválidos.", parsed.error.flatten().fieldErrors);

    await db.user.update({
      where: { id: membership.userId },
      data: {
        name: parsed.data.name,
        phone: parsed.data.phone || null,
      },
    });
    revalidatePath("/app/perfil");
    return ok("Perfil atualizado.");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Erro ao atualizar perfil.");
  }
}

export async function changePassword(input: unknown): Promise<ActionState> {
  try {
    const membership = await getCurrentMembership();
    const schema = z
      .object({
        currentPassword: z.string().min(1, "Informe a senha atual."),
        newPassword: passwordSchema,
        confirmPassword: z.string().min(1, "Confirme a nova senha."),
      })
      .refine((data) => data.newPassword === data.confirmPassword, {
        path: ["confirmPassword"],
        message: "As senhas não coincidem.",
      });
    const parsed = schema.safeParse(input);
    if (!parsed.success) return fail("Dados inválidos.", parsed.error.flatten().fieldErrors);

    const user = await db.user.findUnique({
      where: { id: membership.userId },
    });
    if (!user) return fail("Usuário não encontrado.");
    if (!(await verifyPassword(parsed.data.currentPassword, user.passwordHash))) {
      return fail("A senha atual está incorreta.");
    }

    await db.user.update({
      where: { id: membership.userId },
      data: {
        passwordHash: await hashPassword(parsed.data.newPassword),
      },
    });

    return ok("Senha alterada com sucesso.");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Erro ao atualizar senha.");
  }
}

export async function createPublicBooking(input: unknown): Promise<ActionState> {
  try {
    const parsed = publicBookingSchema.safeParse(input);
    if (!parsed.success) return fail("Dados inválidos.", parsed.error.flatten().fieldErrors);
    const data = parsed.data;

    const organization = await db.organization.findUnique({
      where: { slug: data.organizationSlug },
    });
    if (!organization || !organization.isActive) return fail("Salão indisponível no momento.");

    const startAt = buildStartDate(data.date, data.time);
    await enforceAppointmentLimit({
      organizationId: organization.id,
      startAt,
    });
    const slots = await getAvailableSlots({
      organizationId: organization.id,
      serviceId: data.serviceId,
      professionalId: data.professionalId,
      date: buildStartDate(data.date, "00:00"),
    });

    const selectedSlot = slots.find(
      (slot) =>
        slot.time === data.time &&
        (!data.professionalId || slot.professionalId === data.professionalId)
    );
    if (!selectedSlot) return fail("Horário indisponível.");

    const service = await db.service.findFirst({
      where: { id: data.serviceId, organizationId: organization.id, isActive: true },
    });
    if (!service) return fail("Serviço inválido.");

    const client = await db.client.create({
      data: {
        organizationId: organization.id,
        name: data.name,
        phone: data.phone || null,
        email: data.email || null,
        notes: data.notes || null,
      },
    });

    const appointment = await db.appointment.create({
      data: {
        organizationId: organization.id,
        clientId: client.id,
        professionalId: selectedSlot.professionalId,
        serviceId: service.id,
        startAt,
        endAt: addMinutes(startAt, service.durationMinutes),
        status: AppointmentStatus.PENDING,
        priceInCents: service.priceInCents,
        notes: data.notes || null,
      },
    });

    if (client.email) {
      await sendBookingReceivedEmail({
        to: client.email,
        clientName: client.name,
        organizationName: organization.name,
        serviceName: service.name,
        professionalName: selectedSlot.professionalName,
        startAt: appointment.startAt,
        priceInCents: service.priceInCents,
      });
    }

    revalidatePath(`/${organization.slug}`);
    return ok("Agendamento solicitado com sucesso.");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Erro ao criar agendamento.");
  }
}

export async function getPublicAvailability(input: {
  organizationSlug: string;
  serviceId: string;
  professionalId?: string;
  date: string;
}) {
  const organization = await db.organization.findUnique({
    where: { slug: input.organizationSlug },
  });

  if (!organization || !organization.isActive) {
    return [];
  }

  return getAvailableSlots({
    organizationId: organization.id,
    serviceId: input.serviceId,
    professionalId: input.professionalId || undefined,
    date: buildStartDate(input.date, "00:00"),
  });
}

export async function getAppointmentAvailability(input: {
  serviceId: string;
  professionalId?: string;
  date: string;
  currentAppointmentId?: string;
}) {
  const membership = await requireScope("appointments");

  if (!input.serviceId || !input.date) {
    return [];
  }

  return getAvailableSlots({
    organizationId: membership.organizationId,
    serviceId: input.serviceId,
    professionalId: input.professionalId || undefined,
    date: buildStartDate(input.date, "00:00"),
    currentAppointmentId: input.currentAppointmentId,
  });
}

export async function createBlockedTime(input: unknown): Promise<ActionState> {
  try {
    const membership = await requireScope("appointments");
    const parsed = blockedTimeSchema.safeParse(input);
    if (!parsed.success) return fail("Dados inválidos.", parsed.error.flatten().fieldErrors);

    const data = parsed.data;
    const startAt = buildStartDate(data.date, data.startTime);
    const endAt = buildStartDate(data.date, data.endTime);

    if (endAt <= startAt) {
      return fail("O horário final deve ser maior que o inicial.");
    }

    if (data.professionalId) {
      const professional = await db.professional.findFirst({
        where: {
          id: data.professionalId,
          organizationId: membership.organizationId,
          isActive: true,
        },
      });

      if (!professional) {
        return fail("Profissional inválido.");
      }
    }

    await db.blockedTime.create({
      data: {
        organizationId: membership.organizationId,
        professionalId: data.professionalId || null,
        startAt,
        endAt,
        reason: data.reason?.trim() || null,
      },
    });

    revalidatePath("/app/agenda");
    revalidatePath("/app/agendamentos");
    revalidatePath("/app");
    return ok("Horário bloqueado com sucesso.");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Erro ao bloquear horário.");
  }
}

export async function deleteBlockedTime(id: string): Promise<ActionState> {
  try {
    const membership = await requireScope("appointments");

    const blockedTime = await db.blockedTime.findFirst({
      where: {
        id,
        organizationId: membership.organizationId,
      },
    });

    if (!blockedTime) {
      return fail("Bloqueio não encontrado.");
    }

    await db.blockedTime.delete({
      where: { id },
    });

    revalidatePath("/app/agenda");
    revalidatePath("/app/agendamentos");
    revalidatePath("/app");
    return ok("Bloqueio removido.");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Erro ao remover bloqueio.");
  }
}
