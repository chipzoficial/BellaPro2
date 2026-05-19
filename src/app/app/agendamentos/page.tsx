import { getCurrentMembership } from "@/lib/auth/session";
import { getAppointmentManagementData } from "@/server/queries/app";
import { PageHeader } from "@/components/shared/page-header";
import { AgendamentosPage } from "@/components/app/agendamentos-page";

export default async function AgendamentosRoute({
  searchParams,
}: {
  searchParams?: Promise<{ novo?: string }>;
}) {
  const membership = await getCurrentMembership();
  const summary = await getAppointmentManagementData(membership.organizationId);
  const resolvedSearchParams = await searchParams;

  return (
    <div className="space-y-8">
      <PageHeader title="Agendamentos" description="Acompanhe os atendimentos em andamento e ajuste o que estiver aberto." />
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
