import { getCurrentMembership } from "@/lib/auth/session";
import { getOrganizationSummary } from "@/server/queries/app";
import { PageHeader } from "@/components/shared/page-header";
import { AgendamentosPage } from "@/components/app/agendamentos-page";

export default async function AgendamentosRoute({
  searchParams,
}: {
  searchParams?: Promise<{ novo?: string }>;
}) {
  const membership = await getCurrentMembership();
  const summary = await getOrganizationSummary(membership.organizationId);
  const resolvedSearchParams = await searchParams;

  return (
    <div className="space-y-8">
      <PageHeader title="Agendamentos" description="Liste, filtre e ajuste o status dos atendimentos do salão." />
      <AgendamentosPage
        initialOpen={resolvedSearchParams?.novo === "1"}
        appointments={summary.appointments}
        clients={summary.clients}
        professionals={summary.professionals}
        services={summary.services}
      />
    </div>
  );
}
