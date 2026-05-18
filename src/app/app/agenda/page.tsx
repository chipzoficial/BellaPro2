import { addMonths, endOfMonth, startOfMonth, subMonths } from "date-fns";
import { getCurrentMembership } from "@/lib/auth/session";
import { getAgendaWorkspace } from "@/server/queries/app";
import { PageHeader } from "@/components/shared/page-header";
import { AgendaWorkspace } from "@/components/agenda/agenda-workspace";

export default async function AgendaPage() {
  const membership = await getCurrentMembership();
  const rangeStart = startOfMonth(subMonths(new Date(), 1));
  const rangeEnd = endOfMonth(addMonths(new Date(), 2));
  const { appointments, professionals } = await getAgendaWorkspace(membership.organizationId, rangeStart, rangeEnd);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agenda"
        description="Acompanhe os horários do dia e os próximos atendimentos."
      />
      <AgendaWorkspace appointments={appointments} professionals={professionals} />
    </div>
  );
}
