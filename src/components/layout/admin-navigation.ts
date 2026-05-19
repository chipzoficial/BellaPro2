import { Building2, LayoutDashboard, Tags, Users } from "lucide-react";

export const adminNavigationItems = [
  { href: "/admin", label: "Visão geral", icon: LayoutDashboard },
  { href: "/admin/saloes", label: "Salões", icon: Building2 },
  { href: "/admin/usuarios", label: "Usuários", icon: Users },
  { href: "/admin/planos", label: "Planos", icon: Tags },
] as const;
