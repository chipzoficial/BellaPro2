import { getCurrentMembership } from "@/lib/auth/session";
import { getSubscriptionNotice } from "@/lib/billing";
import { getRequestOrigin } from "@/lib/request-origin";
import { getDashboardData } from "@/server/queries/dashboard";
import { PageHeader } from "@/components/shared/page-header";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";

export default async function DashboardPage() {
  const membership = await getCurrentMembership();
  const [data, subscriptionNotice] = await Promise.all([
    getDashboardData(membership.organizationId),
    getSubscriptionNotice(membership.organizationId),
  ]);
  const publicBaseUrl = await getRequestOrigin();

  return (
    <div className="space-y-8">
      <PageHeader title="Dashboard" description="Visão rápida do salão, da agenda e do ritmo do mês." />
      <DashboardOverview data={data} publicBaseUrl={publicBaseUrl} subscriptionNotice={subscriptionNotice} />
    </div>
  );
}
