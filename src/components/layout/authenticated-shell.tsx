"use client";

import { usePathname } from "next/navigation";
import { Role, SubscriptionStatus } from "@prisma/client";
import { AppShell } from "@/components/layout/app-shell";

export function AuthenticatedShell({
  salonName,
  userName,
  role,
  subscriptionNotice,
  children,
}: {
  salonName: string;
  userName: string;
  role: Role;
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
  const pathname = usePathname();
  return (
    <AppShell
      pathname={pathname}
      salonName={salonName}
      userName={userName}
      role={role}
      subscriptionNotice={subscriptionNotice}
    >
      {children}
    </AppShell>
  );
}
