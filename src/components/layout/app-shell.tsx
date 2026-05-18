import Link from "next/link";
import { SubscriptionStatus } from "@prisma/client";
import { AlertCircle, Sparkles } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";

export function AppShell({
  pathname,
  salonName,
  userName,
  subscriptionNotice,
  children,
}: {
  pathname: string;
  salonName: string;
  userName: string;
  subscriptionNotice: {
    status: SubscriptionStatus;
    planName: string;
    currentPeriodEnd: Date;
    daysRemaining: number;
    isTrial: boolean;
    isExpiringSoon: boolean;
  } | null;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f7f2f1] text-foreground">
      <div className="flex min-h-screen">
        <Sidebar pathname={pathname} />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <Topbar salonName={salonName} userName={userName} />
          {subscriptionNotice?.isTrial ? <TrialBanner notice={subscriptionNotice} /> : null}
          <main className="flex-1 px-4 py-6 md:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}

function TrialBanner({
  notice,
}: {
  notice: {
    currentPeriodEnd: Date;
    daysRemaining: number;
    isExpiringSoon: boolean;
  };
}) {
  return (
    <div
      className={`border-b px-4 py-3 md:px-6 ${
        notice.isExpiringSoon
          ? "border-amber-200 bg-amber-50/90"
          : "border-brand-200 bg-brand-50/80"
      }`}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          {notice.isExpiringSoon ? (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
          ) : (
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
          )}
          <div>
            <p className="text-sm font-medium text-foreground">
              {notice.isExpiringSoon
                ? `Seu período de teste termina em ${notice.daysRemaining} dia${notice.daysRemaining === 1 ? "" : "s"}.`
                : "Seu período de teste está ativo."}
            </p>
            <p className="text-xs text-muted-foreground">
              Vigente até {formatDateTime(notice.currentPeriodEnd, "dd/MM/yyyy")}. Escolha um plano para evitar bloqueios quando o período promocional acabar.
            </p>
          </div>
        </div>
        <Button asChild size="sm" className="w-full sm:w-auto">
          <Link href="/app/assinatura">Escolher plano</Link>
        </Button>
      </div>
    </div>
  );
}
