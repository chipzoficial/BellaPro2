import type { Role } from "@prisma/client";

export const RESERVED_SLUGS = [
  "app",
  "admin",
  "api",
  "login",
  "register",
  "criar-conta",
  "dashboard",
  "agenda",
  "agendamentos",
  "clientes",
  "profissionais",
  "servicos",
  "serviços",
  "financeiro",
  "configuracoes",
  "configurações",
  "perfil",
  "suporte",
  "termos",
  "privacidade",
  "politica",
  "checkout",
  "planos",
  "assinatura",
  "billing",
  "auth",
  "logout",
  "settings",
];

export const APP_ROLES: Role[] = ["OWNER", "MANAGER", "PROFESSIONAL", "RECEPTIONIST"];
