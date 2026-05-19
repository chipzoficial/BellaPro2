import type { Role } from "@prisma/client";
import { BriefcaseBusiness, CalendarClock, CalendarDays, History, LayoutDashboard, Scissors, Settings, Users, Wallet } from "lucide-react";
import { canAccess } from "@/lib/permissions";

const navigationItems = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard, resource: "dashboard" },
  { href: "/app/agenda", label: "Agenda", icon: CalendarDays, resource: "appointments" },
  { href: "/app/agendamentos", label: "Agendamentos", icon: CalendarClock, resource: "appointments" },
  { href: "/app/historico", label: "Histórico", icon: History, resource: "appointments" },
  { href: "/app/clientes", label: "Clientes", icon: Users, resource: "clients" },
  { href: "/app/profissionais", label: "Profissionais", icon: BriefcaseBusiness, resource: "professionals" },
  { href: "/app/servicos", label: "Serviços", icon: Scissors, resource: "services" },
  { href: "/app/financeiro", label: "Financeiro", icon: Wallet, resource: "financial" },
  { href: "/app/configuracoes", label: "Configurações", icon: Settings, resource: "settings" },
] as const;

export function getNavigationItems(role: Role) {
  return navigationItems.filter((item) => canAccess(item.resource, role));
}
