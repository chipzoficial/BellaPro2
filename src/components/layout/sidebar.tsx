import Link from "next/link";
import type { Role } from "@prisma/client";
import { AlertCircle, Sparkles } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { AppLogo } from "@/components/brand/app-logo";
import { getNavigationItems } from "@/components/layout/navigation-items";

export function Sidebar({
  pathname,
  role,
  subscriptionNotice,
}: {
  pathname: string;
  role: Role;
  subscriptionNotice: {
    currentPeriodEnd: Date;
    daysRemaining: number;
    isExpiringSoon: boolean;
  } | null;
}) {
  const navigationItems = getNavigationItems(role);

  return (
    <aside className="sticky top-0 hidden h-screen w-72 shrink-0 border-r border-border bg-[#fffaf9] px-5 py-6 lg:flex lg:flex-col">
      <div className="mb-8">
        <AppLogo className="w-[170px]" />
        <p className="mt-2 text-sm text-muted-foreground">Gestão e agendamento para salões de beleza.</p>
      </div>
      <nav className="space-y-1 overflow-y-auto">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-white hover:text-foreground",
                active && "bg-white text-foreground shadow-sm"
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
              className="block text-sm font-medium text-brand-700 transition-colors hover:text-brand-800"
            >
              Ver planos
            </Link>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
