import { AppointmentStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";

const statusMap = {
  [AppointmentStatus.PENDING]: { label: "Pendente", variant: "warning" as const },
  [AppointmentStatus.CONFIRMED]: { label: "Confirmado", variant: "default" as const },
  [AppointmentStatus.COMPLETED]: { label: "Concluído", variant: "success" as const },
  [AppointmentStatus.CANCELED]: { label: "Cancelado", variant: "danger" as const },
  [AppointmentStatus.NO_SHOW]: { label: "Não compareceu", variant: "secondary" as const },
};

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  const config = statusMap[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
