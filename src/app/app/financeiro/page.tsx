import { Role } from "@prisma/client";
import { getCurrentMembership } from "@/lib/auth/session";
import { getFinancialOverview, type FinancialPeriod } from "@/server/queries/app";
import { PageHeader } from "@/components/shared/page-header";
import { FinanceiroPage } from "@/components/app/financeiro-page";
import { FinancePeriodFilter } from "@/components/app/finance-period-filter";

const allowedPeriods: FinancialPeriod[] = ["month", "last_30_days", "last_90_days", "year"];

export default async function FinanceiroRoute({
  searchParams,
}: {
  searchParams?: Promise<{ period?: string }>;
}) {
  const membership = await getCurrentMembership([Role.OWNER, Role.MANAGER]);
  const resolvedSearchParams = await searchParams;
  const period = allowedPeriods.includes(resolvedSearchParams?.period as FinancialPeriod)
    ? (resolvedSearchParams?.period as FinancialPeriod)
    : "month";
  const financial = await getFinancialOverview(membership.organizationId, period);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Financeiro"
        description="Acompanhe os resultados do período e os serviços com melhor saída."
      />
      <FinancePeriodFilter value={period} />
      <FinanceiroPage
        period={financial.period}
        range={financial.range}
        revenue={financial.revenue}
        completedCount={financial.completedCount}
        canceledCount={financial.canceledCount}
        noShowCount={financial.noShowCount}
        topServices={financial.topServices}
      />
    </div>
  );
}
