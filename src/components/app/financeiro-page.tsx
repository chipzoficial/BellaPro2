import { formatDateTime, formatMoney } from "@/lib/utils";
import type { FinancialPeriod } from "@/server/queries/app";

type TopService = {
  name: string;
  count: number;
  revenue: number;
};

function FinanceMetric({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="border-l border-border pl-4">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-foreground sm:text-3xl">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{helper}</p>
    </div>
  );
}

export function FinanceiroPage({
  period,
  range,
  revenue,
  completedCount,
  canceledCount,
  noShowCount,
  topServices,
}: {
  period: FinancialPeriod;
  range: { start: Date; end: Date };
  revenue: number;
  completedCount: number;
  canceledCount: number;
  noShowCount: number;
  topServices: TopService[];
}) {
  const ticketMedio = completedCount ? Math.round(revenue / completedCount) : 0;
  const totalResolvedAppointments = completedCount + canceledCount + noShowCount;
  const attendanceRate = totalResolvedAppointments
    ? Math.round((completedCount / totalResolvedAppointments) * 100)
    : 0;
  const leadingServiceCount = topServices[0]?.count ?? 1;
  const periodTextMap: Record<FinancialPeriod, string> = {
    month: "neste mês",
    last_30_days: "nos últimos 30 dias",
    last_90_days: "nos últimos 90 dias",
    year: "neste ano",
  };
  const periodLabelMap: Record<FinancialPeriod, string> = {
    month: "Este mês",
    last_30_days: "Últimos 30 dias",
    last_90_days: "Últimos 90 dias",
    year: "Este ano",
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="overflow-hidden rounded-[28px] border border-border bg-white">
        <div className="space-y-5 px-5 py-5 sm:px-7 sm:py-7">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Resumo do período</p>
            <h2 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {formatMoney(revenue)}
            </h2>
            <p className="text-sm text-muted-foreground">
              Resultado estimado com base nos atendimentos concluídos {periodTextMap[period]}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-full bg-[#fffaf9] px-3 py-1 font-medium text-foreground">{periodLabelMap[period]}</span>
            <span>
              {formatDateTime(range.start, "dd/MM/yyyy")} até {formatDateTime(range.end, "dd/MM/yyyy")}
            </span>
          </div>

          <div className="grid gap-4 border-t border-border pt-5 sm:grid-cols-2 xl:grid-cols-3">
            <FinanceMetric
              label="Atendimentos concluídos"
              value={String(completedCount)}
              helper={`${completedCount === 1 ? "1 atendimento concluído" : `${completedCount} atendimentos concluídos`}`}
            />
            <FinanceMetric
              label="Ticket médio"
              value={formatMoney(ticketMedio)}
              helper="Média por atendimento concluído"
            />
            <FinanceMetric
              label="Taxa de comparecimento"
              value={`${attendanceRate}%`}
              helper="Com base em concluídos, cancelados e faltas"
            />
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        <div className="rounded-[28px] border border-border bg-white px-5 py-5 sm:px-6 sm:py-6">
          <div className="space-y-1">
            <h3 className="text-xl font-semibold text-foreground">Serviços com melhor resultado</h3>
            <p className="text-sm text-muted-foreground">Volume e faturamento do período em uma leitura rápida.</p>
          </div>

          <div className="mt-6 space-y-4">
            {topServices.length ? (
              topServices.slice(0, 5).map((item) => {
                const progress = Math.max(10, Math.round((item.count / leadingServiceCount) * 100));

                return (
                  <div key={item.name} className="space-y-3 rounded-[22px] border border-border bg-[#fffaf9] px-4 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{item.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {item.count} venda{item.count === 1 ? "" : "s"} concluída{item.count === 1 ? "" : "s"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-foreground">{formatMoney(item.revenue)}</p>
                        <p className="mt-1 text-xs text-muted-foreground">faturado</p>
                      </div>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white">
                      <div
                        className="h-full rounded-full bg-brand-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-[22px] border border-dashed border-border px-5 py-8 text-center">
                <p className="font-medium text-foreground">Sem movimentação concluída neste período.</p>
                <p className="mt-1 text-sm text-muted-foreground">Os serviços do mês aparecerão aqui.</p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[28px] border border-border bg-white px-5 py-5 sm:px-6 sm:py-6">
          <div className="space-y-1">
            <h3 className="text-xl font-semibold text-foreground">Leitura operacional</h3>
            <p className="text-sm text-muted-foreground">Como os atendimentos encerrados se distribuíram no período.</p>
          </div>

          <div className="mt-6 space-y-3">
            <div className="rounded-[22px] border border-border bg-[#fffaf9] px-4 py-4">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Concluídos</p>
              <div className="mt-2 flex items-end justify-between gap-3">
                <p className="text-2xl font-semibold text-foreground">{completedCount}</p>
                <p className="text-sm text-muted-foreground">Entram no faturamento do período</p>
              </div>
            </div>
            <div className="rounded-[22px] border border-border bg-[#fffaf9] px-4 py-4">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Cancelados</p>
              <div className="mt-2 flex items-end justify-between gap-3">
                <p className="text-2xl font-semibold text-foreground">{canceledCount}</p>
                <p className="text-sm text-muted-foreground">Atendimentos que não foram realizados</p>
              </div>
            </div>
            <div className="rounded-[22px] border border-border bg-[#fffaf9] px-4 py-4">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Não compareceram</p>
              <div className="mt-2 flex items-end justify-between gap-3">
                <p className="text-2xl font-semibold text-foreground">{noShowCount}</p>
                <p className="text-sm text-muted-foreground">Clientes que faltaram ao atendimento</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
