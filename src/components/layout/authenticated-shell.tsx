"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";

export function AuthenticatedShell({
  salonName,
  userName,
  children,
}: {
  salonName: string;
  userName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  return <AppShell pathname={pathname} salonName={salonName} userName={userName}>{children}</AppShell>;
}
