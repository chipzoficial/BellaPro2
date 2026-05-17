"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const items = [
  { href: "/app", label: "Dashboard" },
  { href: "/app/agenda", label: "Agenda" },
  { href: "/app/agendamentos", label: "Agendamentos" },
  { href: "/app/clientes", label: "Clientes" },
  { href: "/app/profissionais", label: "Profissionais" },
  { href: "/app/servicos", label: "Serviços" },
  { href: "/app/financeiro", label: "Financeiro" },
  { href: "/app/configuracoes", label: "Configurações" },
];

export function MobileNav() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="lg:hidden">
          <Menu className="h-7 w-7" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="max-w-xs bg-[#fffaf9]">
        <div className="mb-6">
          <p className="font-heading text-3xl font-semibold text-brand-800">BellaPro</p>
          <p className="mt-2 text-sm text-muted-foreground">Seu salão, sua agenda, seu controle.</p>
        </div>
        <nav className="space-y-2">
          {items.map((item) => (
            <Link key={item.href} href={item.href} className="block rounded-xl px-3 py-2 text-sm font-medium text-foreground hover:bg-white">
              {item.label}
            </Link>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
