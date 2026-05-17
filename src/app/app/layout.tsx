import { getCurrentMembership, requireUser } from "@/lib/auth/session";
import { AuthenticatedShell } from "@/components/layout/authenticated-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const membership = await getCurrentMembership();

  return (
    <AuthenticatedShell salonName={membership.organization.name} userName={user.name}>
      {children}
    </AuthenticatedShell>
  );
}
