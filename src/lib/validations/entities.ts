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
  clientId: z.string().optional().or(z.literal("")),
  clientName: z.string().trim().min(2, "Informe o nome do cliente."),
  clientPhone: phoneSchema,
  clientEmail: z.string().email("E-mail inválido.").optional().or(z.literal("")),
  professionalId: z.string().min(1),
  serviceId: z.string().min(1),
  startAt: z.string().min(1),
  status: z.nativeEnum(AppointmentStatus).default(AppointmentStatus.CONFIRMED),
  notes: z.string().optional(),
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
