import { AppointmentStatus } from "@prisma/client";
import { z } from "zod";
import { phoneSchema, slugSchema } from "@/lib/validations/common";

export const clientSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Informe o nome do cliente."),
  phone: phoneSchema,
  email: z.string().email("E-mail inválido.").optional().or(z.literal("")),
  notes: z.string().optional(),
});

export const professionalSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  phone: phoneSchema,
  email: z.string().email("E-mail inválido.").optional().or(z.literal("")),
  bio: z.string().optional(),
  isActive: z.boolean().default(true),
  serviceIds: z.array(z.string()).default([]),
});

export const serviceSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  description: z.string().optional(),
  durationMinutes: z.coerce.number().min(15).max(480),
  priceInCents: z.coerce.number().min(0),
  isActive: z.boolean().default(true),
  professionalIds: z.array(z.string()).default([]),
});

export const appointmentSchema = z.object({
  id: z.string().optional(),
  clientMode: z.enum(["existing", "new"]).default("existing"),
  clientId: z.string().optional().or(z.literal("")),
  clientName: z.string().trim().min(2, "Informe o nome do cliente."),
  clientPhone: phoneSchema,
  professionalId: z.string().min(1),
  serviceId: z.string().min(1),
  startAt: z.string().min(1, "Selecione um horário disponível."),
  status: z.nativeEnum(AppointmentStatus).default(AppointmentStatus.CONFIRMED),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.clientMode === "existing" && !data.clientId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["clientName"],
      message: "Selecione um cliente cadastrado.",
    });
  }

  if (data.clientMode === "new" && !data.clientPhone) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["clientPhone"],
      message: "Informe o telefone do cliente.",
    });
  }
});

export const blockedTimeSchema = z.object({
  id: z.string().optional(),
  professionalId: z.string().optional().or(z.literal("")),
  date: z.string().min(1, "Selecione a data."),
  startTime: z.string().min(1, "Selecione o horário inicial."),
  endTime: z.string().min(1, "Selecione o horário final."),
  reason: z.string().trim().max(160, "Use até 160 caracteres.").optional(),
}).superRefine((data, ctx) => {
  if (data.endTime <= data.startTime) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["endTime"],
      message: "O horário final deve ser maior que o inicial.",
    });
  }
});

export const businessHoursSchema = z.object({
  professionalId: z.string().min(1),
  days: z.array(
    z.object({
      weekDay: z.enum(["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"]),
      isActive: z.boolean(),
      startTime: z.string(),
      endTime: z.string(),
    })
  ),
}).superRefine((data, ctx) => {
  data.days.forEach((day, index) => {
    if (!day.isActive) return;
    if (!day.startTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["days", index, "startTime"],
        message: "Informe o horário inicial.",
      });
    }
    if (!day.endTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["days", index, "endTime"],
        message: "Informe o horário final.",
      });
    }
    if (day.startTime && day.endTime && day.endTime <= day.startTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["days", index, "endTime"],
        message: "O horário final deve ser maior que o inicial.",
      });
    }
  });
});

export const publicBookingSchema = z.object({
  organizationSlug: slugSchema,
  serviceId: z.string().min(1),
  professionalId: z.string().optional().or(z.literal("")),
  date: z.string().min(1),
  time: z.string().min(1),
  name: z.string().min(2),
  phone: phoneSchema,
  email: z.string().email("E-mail inválido.").optional().or(z.literal("")),
  notes: z.string().optional(),
});

export const organizationSchema = z.object({
  name: z.string().min(2),
  slug: slugSchema,
  phone: phoneSchema,
  email: z.string().email("E-mail inválido.").optional().or(z.literal("")),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
});
