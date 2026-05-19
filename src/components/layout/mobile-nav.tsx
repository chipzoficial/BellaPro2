"use client";

import { useState } from "react";
import Link from "next/link";
import type { Role } from "@prisma/client";
import { AlertCircle, Menu, Sparkles } from "lucide-react";
import { cn, formatDateTime } from "@/lib/utils";
import { AppLogo } from "@/components/brand/app-logo";
import { getNavigationItems } from "@/components/layout/navigation-items";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function MobileNav({
  role,
  subscriptionNotice,
}: {
  role: Role;
  subscriptionNotice: {
    currentPeriodEnd: Date;
    daysRemaining: number;
    isExpiringSoon: boolean;
  } | null;
}) {
  const [open, setOpen] = useState(false);
  const navigationItems = getNavigationItems(role);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="lg:hidden">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="max-w-xs bg-[#fffaf9]">
        <div className="mb-6">
          <AppLogo className="w-[170px]" />
          <p className="mt-2 text-sm text-muted-foreground">Gestão diária do salão em um só lugar.</p>
        </div>
        <div className="flex h-full flex-col">
        <nav className="space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-white hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        {subscriptionNotice ? (
          <div
            className={cn(
              "mt-auto border-t pt-5",
              subscriptionNotice.isExpiringSoon ? "border-amber-200" : "border-border"
            )}
          >
            <div className="space-y-3 rounded-[22px] bg-white/70 px-4 py-4">
              <div className="flex items-start gap-3">
                {subscriptionNotice.isExpiringSoon ? (
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                ) : (
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {subscriptionNotice.isExpiringSoon
                      ? `Faltam ${subscriptionNotice.daysRemaining} dia${subscriptionNotice.daysRemaining === 1 ? "" : "s"}`
                      : "Teste grátis ativo"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Válido até {formatDateTime(subscriptionNotice.currentPeriodEnd, "dd/MM/yyyy")}
                  </p>
                </div>
              </div>
              <Link
                href="/app/assinatura"
                onClick={() => setOpen(false)}
                className="block text-sm font-medium text-brand-700 transition-colors hover:text-brand-800"
              >
                Ver planos
              </Link>
            </div>
          </div>
        ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
