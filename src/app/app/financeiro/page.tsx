import { getCurrentMembership } from "@/lib/auth/session";
import { getOrganizationSummary } from "@/server/queries/app";
import { PageHeader } from "@/components/shared/page-header";
import { FinanceiroPage } from "@/components/app/financeiro-page";

export default async function FinanceiroRoute() {
  const membership = await getCurrentMembership();
  const summary = await getOrganizationSummary(membership.organizationId);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Financeiro"
        description="Acompanhe os resultados do período e os serviços com melhor saída."
      />
      <FinanceiroPage
        revenue={summary.financial.revenue}
        completedCount={summary.financial.completedCount}
        canceledCount={summary.financial.canceledCount}
        noShowCount={summary.financial.noShowCount}
        topServices={summary.financial.topServices}
      />
    </div>
  );
}
