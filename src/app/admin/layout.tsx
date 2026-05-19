import { Role } from "@prisma/client";
import { getCurrentMembership, requireUser } from "@/lib/auth/session";
import { AdminShell } from "@/components/layout/admin-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  await getCurrentMembership([Role.ADMIN_GLOBAL]);

  return <AdminShell userName={user.name}>{children}</AdminShell>;
}
