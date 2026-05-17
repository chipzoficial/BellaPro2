import { z } from "zod";
import { passwordSchema, phoneSchema, slugSchema } from "@/lib/validations/common";

export const loginSchema = z.object({
  email: z.string().email("Informe um e-mail válido."),
  password: z.string().min(1, "Informe a senha."),
});

export const registerSchema = z
  .object({
    name: z.string().min(2, "Informe seu nome."),
    email: z.string().email("Informe um e-mail válido."),
    phone: phoneSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    salonName: z.string().min(2, "Informe o nome do salão."),
    slug: slugSchema,
    salonPhone: phoneSchema,
    city: z.string().min(2, "Informe a cidade."),
    state: z.string().min(2, "Informe o estado."),
    address: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas não coincidem.",
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
