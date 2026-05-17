import { z } from "zod";
import { isReservedSlug, normalizeSlug } from "@/lib/slug";

export const passwordSchema = z
  .string()
  .min(8, "A senha deve ter pelo menos 8 caracteres.")
  .regex(/[A-Za-z]/, "A senha deve conter letras.")
  .regex(/[0-9]/, "A senha deve conter números.");

export const slugSchema = z
  .string()
  .transform((value) => normalizeSlug(value))
  .refine((value) => value.length >= 3, "O slug deve ter pelo menos 3 caracteres.")
  .refine((value) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value), "Slug inválido.")
  .refine((value) => !isReservedSlug(value), "Esse slug é reservado pelo sistema.");

export const phoneSchema = z.string().trim().min(8).max(20).optional().or(z.literal(""));
