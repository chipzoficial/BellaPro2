import { formatMoney } from "@/lib/utils";

export function FinanceiroPage({
  revenue,
  completedCount,
  appointments,
}: {
  revenue: number;
  completedCount: number;
  appointments: Array<any>;
}) {
  const ticketMedio = completedCount ? Math.round(revenue / completedCount) : 0;
  const topServices = Object.values(
    appointments.reduce<Record<string, { name: string; count: number }>>((acc, item) => {
      if (item.status !== "COMPLETED") return acc;
      acc[item.service.name] = {
        name: item.service.name,
        count: (acc[item.service.name]?.count ?? 0) + 1,
      };
      return acc;
    }, {})
  ).sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-white p-5">
          <p className="text-sm text-muted-foreground">Faturamento estimado</p>
          <p className="mt-3 text-2xl font-semibold">{formatMoney(revenue)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-white p-5">
          <p className="text-sm text-muted-foreground">Agendamentos concluídos</p>
          <p className="mt-3 text-2xl font-semibold">{completedCount}</p>
        </div>
        <div className="rounded-2xl border border-border bg-white p-5">
          <p className="text-sm text-muted-foreground">Ticket médio</p>
          <p className="mt-3 text-2xl font-semibold">{formatMoney(ticketMedio)}</p>
        </div>
      </div>
      <section className="rounded-3xl border border-border bg-white p-6">
        <h3 className="text-lg font-semibold">Serviços mais vendidos</h3>
        <div className="mt-6 space-y-3">
          {topServices.length ? topServices.slice(0, 5).map((item) => (
            <div key={item.name} className="flex items-center justify-between rounded-2xl bg-muted/40 px-4 py-3">
              <span>{item.name}</span>
              <strong>{item.count}</strong>
            </div>
          )) : <p className="text-sm text-muted-foreground">Ainda não há serviços concluídos neste período.</p>}
        </div>
      </section>
    </div>
  );
}
