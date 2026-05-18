import { z } from "zod";
import { onboardingServiceCatalog } from "@/lib/onboarding";
import { passwordSchema, phoneSchema, slugSchema } from "@/lib/validations/common";

export const loginSchema = z.object({
  email: z.string().email("Informe um e-mail válido."),
  password: z.string().min(1, "Informe a senha."),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Informe um e-mail válido."),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Token inválido."),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirme a nova senha."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas não coincidem.",
  });

const requiredPhoneSchema = phoneSchema.refine((value) => !!value, "Informe um telefone.");
const serviceKeyEnum = z.enum(onboardingServiceCatalog.map((service) => service.key) as [string, ...string[]]);

const professionalOnboardingSchema = z.object({
  name: z.string().min(2, "Informe o nome do profissional."),
  phone: requiredPhoneSchema,
  email: z.string().email("Informe um e-mail válido.").optional().or(z.literal("")),
  serviceKeys: z.array(serviceKeyEnum).min(1, "Selecione ao menos um serviço para este profissional."),
});

export const registerSchema = z
  .object({
    name: z.string().min(2, "Informe seu nome."),
    email: z.string().email("Informe um e-mail válido."),
    phone: requiredPhoneSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    salonName: z.string().min(2, "Informe o nome do salão."),
    slug: slugSchema,
    salonPhone: requiredPhoneSchema,
    city: z.string().min(2, "Informe a cidade."),
    state: z.string().min(2, "Informe o estado."),
    address: z.string().trim().min(5, "Informe o endereço do salão."),
    teamSize: z.number().int().min(1, "Cadastre ao menos um profissional.").max(20, "O onboarding inicial suporta até 20 profissionais."),
    serviceKeys: z.array(serviceKeyEnum).min(1, "Selecione ao menos um serviço inicial."),
    professionals: z.array(professionalOnboardingSchema).min(1, "Cadastre ao menos um profissional."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas não coincidem.",
  })
  .superRefine((data, ctx) => {
    if (data.professionals.length !== data.teamSize) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["teamSize"],
        message: "A quantidade de profissionais deve bater com o total cadastrado nesta etapa.",
      });
    }

    data.professionals.forEach((professional, index) => {
      professional.serviceKeys.forEach((serviceKey) => {
        if (!data.serviceKeys.includes(serviceKey)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["professionals", index, "serviceKeys"],
            message: "Esse profissional só pode receber serviços escolhidos na etapa anterior.",
          });
        }
      });
    });
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
