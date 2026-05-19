import { formatDateTime } from "@/lib/utils";
import { getAppointmentClientName } from "@/lib/appointment-client";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";

export function UpcomingAppointments({
  items,
}: {
  items: Array<{
    id: string;
    startAt: Date;
    client: { name: string } | null;
    clientNameSnapshot: string;
    service: { name: string };
    professional: { name: string };
    status: import("@prisma/client").AppointmentStatus;
  }>;
}) {
  if (!items.length) {
    return <EmptyState title="Sem próximos agendamentos" description="Os próximos horários confirmados aparecerão aqui." />;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-background px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-medium">{getAppointmentClientName(item)}</p>
            <p className="text-sm text-muted-foreground">
              {item.service.name} com {item.professional.name}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(item.startAt)}</p>
          </div>
          <StatusBadge status={item.status} />
        </div>
      ))}
    </div>
  );
}
