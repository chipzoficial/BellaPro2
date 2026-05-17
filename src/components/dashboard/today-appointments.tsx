import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";

export function TodayAppointments({
  items,
}: {
  items: Array<{
    id: string;
    startAt: Date;
    client: { name: string };
    professional: { name: string };
    service: { name: string };
    status: import("@prisma/client").AppointmentStatus;
  }>;
}) {
  if (!items.length) {
    return <EmptyState title="Agenda tranquila hoje" description="Nenhum agendamento encontrado para hoje." />;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="grid gap-3 rounded-2xl border border-border bg-white/70 p-4 md:grid-cols-[110px_1fr_auto] md:items-center">
          <div className="text-sm font-semibold text-brand-700">
            {format(item.startAt, "HH:mm", { locale: ptBR })}
          </div>
          <div>
            <p className="font-medium">{item.client.name}</p>
            <p className="text-sm text-muted-foreground">
              {item.service.name} com {item.professional.name}
            </p>
          </div>
          <StatusBadge status={item.status} />
        </div>
      ))}
    </div>
  );
}
