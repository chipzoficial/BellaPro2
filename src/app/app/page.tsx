import { getCurrentMembership } from "@/lib/auth/session";
import { getDashboardData } from "@/server/queries/dashboard";
import { PageHeader } from "@/components/shared/page-header";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";

export default async function DashboardPage() {
  const membership = await getCurrentMembership();
  const data = await getDashboardData(membership.organizationId);

  return (
    <div className="space-y-8">
      <PageHeader title="Dashboard" description="Visão rápida do salão, da agenda e do ritmo do mês." />
      <DashboardOverview data={data} />
    </div>
  );
}
