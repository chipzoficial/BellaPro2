import { getCurrentMembership } from "@/lib/auth/session";
import { getAppointmentManagementData } from "@/server/queries/app";
import { PageHeader } from "@/components/shared/page-header";
import { HistoricoPage } from "@/components/app/historico-page";

export default async function HistoricoRoute() {
  const membership = await getCurrentMembership();
  const data = await getAppointmentManagementData(membership.organizationId);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Histórico"
        description="Revise atendimentos encerrados e ajuste o status quando necessário."
      />
      <HistoricoPage appointments={data.appointments} />
    </div>
  );
}
