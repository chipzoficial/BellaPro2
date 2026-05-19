import { SubscriptionStatus } from "@prisma/client";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

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
        <Sidebar pathname={pathname} subscriptionNotice={subscriptionNotice?.isTrial ? subscriptionNotice : null} />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <Topbar
            salonName={salonName}
            userName={userName}
            subscriptionNotice={subscriptionNotice?.isTrial ? subscriptionNotice : null}
          />
          <main className="flex-1 px-4 py-6 md:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
