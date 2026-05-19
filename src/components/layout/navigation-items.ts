import { BriefcaseBusiness, CalendarClock, History, LayoutDashboard, Scissors, Settings, Users, Wallet } from "lucide-react";

export const navigationItems = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/agenda", label: "Agenda", icon: CalendarClock },
  { href: "/app/agendamentos", label: "Agendamentos", icon: CalendarClock },
  { href: "/app/historico", label: "Histórico", icon: History },
  { href: "/app/clientes", label: "Clientes", icon: Users },
  { href: "/app/profissionais", label: "Profissionais", icon: BriefcaseBusiness },
  { href: "/app/servicos", label: "Serviços", icon: Scissors },
  { href: "/app/financeiro", label: "Financeiro", icon: Wallet },
  { href: "/app/configuracoes", label: "Configurações", icon: Settings },
] as const;
