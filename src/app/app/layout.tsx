import { getCurrentMembership, requireUser } from "@/lib/auth/session";
import { getSubscriptionNotice } from "@/lib/billing";
import { AuthenticatedShell } from "@/components/layout/authenticated-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const membership = await getCurrentMembership();
  const subscriptionNotice = await getSubscriptionNotice(membership.organizationId);

  return (
    <AuthenticatedShell
      salonName={membership.organization.name}
      userName={user.name}
      role={membership.role}
      subscriptionNotice={subscriptionNotice}
    >
      {children}
    </AuthenticatedShell>
  );
}
