import Link from "next/link";
import { AppointmentStatus, SubscriptionStatus } from "@prisma/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertCircle,
  ArrowRight,
  CalendarClock,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  Plus,
  Scissors,
  Sparkles,
  Users,
} from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionHeader } from "@/components/shared/section-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime, formatMoney } from "@/lib/utils";

type AppointmentItem = {
  id: string;
  startAt: Date;
  endAt: Date;
  status: AppointmentStatus;
  client: { name: string };
  professional: { name: string };
  service: { name: string };
};

export function DashboardOverview({
  data,
  publicBaseUrl,
  subscriptionNotice,
}: {
  data: {
    organization: { name: string; slug: string };
    nextAppointment: AppointmentItem | null;
    todayAppointments: AppointmentItem[];
    upcomingAppointments: AppointmentItem[];
    professionalsToday: Array<{
      id: string;
      name: string;
      appointmentsCount: number;
      completedCount: number;
      pendingCount: number;
      nextStartAt: Date | null;
    }>;
    serviceLeaders: Array<{ name: string; count: number; revenue: number }>;
    alerts: Array<{ tone: "default" | "warning" | "danger"; title: string; description: string }>;
    metrics: {
      today: {
        appointmentsCount: number;
        completedCount: number;
        pendingCount: number;
        activeNowCount: number;
        freeProfessionalsNow: number;
      };
      month: {
        clientsCount: number;
        newClientsCount: number;
        professionalsCount: number;
        estimatedRevenue: number;
        attendanceRate: number;
        ticketAverage: number;
        canceledCount: number;
        completedCount: number;
        busiestDayLabel: string;
      };
    };
  };
  publicBaseUrl: string;
  subscriptionNotice: {
    status: SubscriptionStatus;
    planName: string;
    currentPeriodEnd: Date;
    daysRemaining: number;
    isTrial: boolean;
    isExpiringSoon: boolean;
  } | null;
}) {
  const publicUrl = new URL(`/${data.organization.slug}`, publicBaseUrl).toString();
  const nextAppointmentLabel = data.nextAppointment
    ? `${format(data.nextAppointment.startAt, "HH:mm", { locale: ptBR })} - ${data.nextAppointment.client.name}`
    : "Sem próximos atendimentos";

  return (
    <div className="space-y-8">
      {subscriptionNotice?.isTrial ? (
        <Card className={subscriptionNotice.isExpiringSoon ? "border-amber-200 bg-amber-50/80" : "border-brand-200 bg-brand-50/70"}>
          <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <Sparkles className={`mt-0.5 h-4 w-4 shrink-0 ${subscriptionNotice.isExpiringSoon ? "text-amber-700" : "text-brand-700"}`} />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {subscriptionNotice.isExpiringSoon
                    ? `Seu teste termina em ${subscriptionNotice.daysRemaining} dia${subscriptionNotice.daysRemaining === 1 ? "" : "s"}.`
                    : `Seu teste do plano ${subscriptionNotice.planName} está ativo.`}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Vigente até {formatDateTime(subscriptionNotice.currentPeriodEnd, "dd/MM/yyyy")}. Escolha um plano para manter a agenda liberada sem interrupções.
                </p>
              </div>
            </div>
            <Button asChild className="w-full md:w-auto">
              <Link href="/app/assinatura">Escolher plano</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_360px]">
        <Card className="bg-white/90">
          <CardContent className="p-6 md:p-7">
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Badge variant="outline" className="border-brand-200 bg-brand-50 text-brand-700">
                    Ritmo do dia
                  </Badge>
                  <h2 className="mt-4 font-heading text-3xl leading-tight text-foreground">
                    {data.nextAppointment ? "Próximo atendimento" : "Painel do salão pronto para agir"}
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                    {data.nextAppointment
                      ? `${nextAppointmentLabel} com ${data.nextAppointment.professional.name}. Use o painel para confirmar, encaixar ou antecipar a próxima movimentação do dia.`
                      : "Sem agendamento futuro neste momento. Aproveite para organizar a agenda, revisar pendências e divulgar o link público."}
                  </p>
                </div>
                {data.nextAppointment ? <StatusBadge status={data.nextAppointment.status} /> : null}
              </div>

              <div className="grid gap-4 border-t border-border pt-5 sm:grid-cols-2 xl:grid-cols-4">
                <QuickStat
                  icon={CalendarClock}
                  label="Atendimentos hoje"
                  value={String(data.metrics.today.appointmentsCount)}
                  helper={`${data.metrics.today.pendingCount} pendente${data.metrics.today.pendingCount === 1 ? "" : "s"}`}
                />
                <QuickStat
                  icon={Users}
                  label="Profissionais livres"
                  value={String(data.metrics.today.freeProfessionalsNow)}
                  helper={`${data.metrics.today.activeNowCount} em atendimento agora`}
                />
                <QuickStat
                  icon={CircleDollarSign}
                  label="Ticket médio"
                  value={formatMoney(data.metrics.month.ticketAverage)}
                  helper="Somente atendimentos concluídos"
                />
                <QuickStat
                  icon={Scissors}
                  label="Concluídos no mês"
                  value={String(data.metrics.month.completedCount)}
                  helper={data.metrics.month.busiestDayLabel}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/90">
          <CardContent className="p-6">
            <div className="space-y-5">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Atalho rápido</p>
                <h3 className="text-xl font-semibold text-foreground">
                  {data.nextAppointment ? data.nextAppointment.client.name : data.organization.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {data.nextAppointment
                    ? `${data.nextAppointment.service.name} com ${data.nextAppointment.professional.name}`
                    : "Agenda vazia no momento. Crie um atendimento ou abra o link público."}
                </p>
              </div>

              <div className="space-y-2">
                <InfoRow
                  icon={Clock3}
                  label="Próximo horário"
                  value={data.nextAppointment ? formatDateTime(data.nextAppointment.startAt) : "Sem horário marcado"}
                />
                <InfoRow
                  icon={CalendarDays}
                  label="Link público"
                  value={publicUrl.replace(/^https?:\/\//, "")}
                />
              </div>

              <div className="grid gap-2">
                <QuickAction href="/app/agenda" icon={CalendarClock} label="Abrir agenda" />
                <QuickAction href="/app/agendamentos?novo=1" icon={Plus} label="Novo agendamento" />
                <QuickAction href="/app/clientes" icon={Users} label="Novo cliente" />
                <QuickAction href={`/${data.organization.slug}`} icon={ArrowRight} label="Abrir agenda pública" external />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <SectionHeader title="Hoje" description="O que pede atenção imediata no salão." />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="Agendamentos do dia" value={String(data.metrics.today.appointmentsCount)} helper={`${data.metrics.today.completedCount} concluído${data.metrics.today.completedCount === 1 ? "" : "s"}`} />
          <MetricCard label="Pendentes agora" value={String(data.metrics.today.pendingCount)} helper="Confirmações que ainda exigem retorno" />
          <MetricCard label="Em atendimento" value={String(data.metrics.today.activeNowCount)} helper="Clientes em execução neste instante" />
          <MetricCard label="Profissionais livres" value={String(data.metrics.today.freeProfessionalsNow)} helper="Disponíveis para encaixe ou novo horário" />
          <MetricCard label="Clientes no mês" value={String(data.metrics.month.clientsCount)} helper={`${data.metrics.month.newClientsCount} novos neste mês`} />
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader title="Mês" description="Leitura de desempenho e consistência da operação." />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Faturamento realizado" value={formatMoney(data.metrics.month.estimatedRevenue)} helper={`${data.metrics.month.completedCount} atendimento${data.metrics.month.completedCount === 1 ? "" : "s"} concluído${data.metrics.month.completedCount === 1 ? "" : "s"}`} />
          <MetricCard label="Taxa de comparecimento" value={`${data.metrics.month.attendanceRate}%`} helper="Baseada em concluídos e faltas registradas" />
          <MetricCard label="Ticket médio" value={formatMoney(data.metrics.month.ticketAverage)} helper="Valor médio por atendimento concluído" />
          <MetricCard label="Cancelamentos" value={String(data.metrics.month.canceledCount)} helper={data.metrics.month.busiestDayLabel} />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.85fr)]">
        <div className="space-y-6">
          <div>
            <SectionHeader title="Agenda de hoje" description="Linha do tempo operacional para acompanhar o ritmo do salão." />
            <TodayTimeline items={data.todayAppointments} />
          </div>

          <div>
            <SectionHeader title="Próximos agendamentos" description="O que já está confirmado ou aguardando confirmação a partir de agora." />
            <UpcomingList items={data.upcomingAppointments} />
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <SectionHeader title="Equipe do dia" description="Carga de atendimentos e próximo horário de cada profissional." />
            <ProfessionalsPanel items={data.professionalsToday} />
          </div>

          <div>
            <SectionHeader title="Serviços mais vendidos" description="Ranking do mês com volume e faturamento." />
            <TopServicesPanel items={data.serviceLeaders} />
          </div>

          <div>
            <SectionHeader title="Alertas rápidos" description="Pontos que merecem ajuste antes de virar problema na agenda." />
            <AlertsPanel items={data.alerts} />
          </div>
        </div>
      </section>
    </div>
  );
}

function QuickStat({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: typeof CalendarClock;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="border-l border-border pl-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4 text-brand-700" />
        <span className="text-xs font-medium uppercase tracking-[0.16em]">{label}</span>
      </div>
      <p className="mt-3 text-2xl font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
  external = false,
}: {
  href: string;
  icon: typeof CalendarClock;
  label: string;
  external?: boolean;
}) {
  return (
    <Button asChild variant="ghost" className="h-auto justify-start rounded-2xl border border-border bg-background px-4 py-3 text-left">
      <Link href={href} {...(external ? { target: "_blank", rel: "noreferrer" } : {})}>
        <Icon className="h-4 w-4 text-brand-700" />
        <span>{label}</span>
      </Link>
    </Button>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock3;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-[#fffaf9] px-4 py-3">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
          <p className="mt-1 break-all text-sm text-foreground">{value}</p>
        </div>
      </div>
    </div>
  );
}

function TodayTimeline({ items }: { items: AppointmentItem[] }) {
  if (!items.length) {
    return <EmptyState title="Agenda tranquila hoje" description="Nenhum agendamento encontrado para hoje." />;
  }

  return (
    <div className="overflow-hidden rounded-[24px] border border-border bg-white">
      {items.map((item, index) => (
        <div
          key={item.id}
          className={`grid gap-3 px-5 py-4 md:grid-cols-[88px_minmax(0,1fr)_auto] md:items-center ${index !== items.length - 1 ? "border-b border-border" : ""}`}
        >
          <div>
            <p className="text-lg font-semibold text-brand-800">{format(item.startAt, "HH:mm", { locale: ptBR })}</p>
            <p className="text-xs text-muted-foreground">{format(item.endAt, "HH:mm", { locale: ptBR })}</p>
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{item.client.name}</p>
            <p className="truncate text-sm text-muted-foreground">
              {item.service.name} com {item.professional.name}
            </p>
          </div>
          <div className="flex justify-start md:justify-end">
            <StatusBadge status={item.status} />
          </div>
        </div>
      ))}
    </div>
  );
}

function UpcomingList({ items }: { items: AppointmentItem[] }) {
  if (!items.length) {
    return <EmptyState title="Sem próximos agendamentos" description="Os próximos horários confirmados aparecerão aqui." />;
  }

  return (
    <div className="overflow-hidden rounded-[24px] border border-border bg-white">
      {items.map((item) => (
        <div key={item.id} className="flex flex-col gap-3 border-b border-border px-5 py-4 last:border-b-0 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-foreground">{item.client.name}</p>
              <span className="text-xs text-muted-foreground">{formatDateTime(item.startAt)}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {item.service.name} com {item.professional.name}
            </p>
          </div>
          <StatusBadge status={item.status} />
        </div>
      ))}
    </div>
  );
}

function ProfessionalsPanel({
  items,
}: {
  items: Array<{
    id: string;
    name: string;
    appointmentsCount: number;
    completedCount: number;
    pendingCount: number;
    nextStartAt: Date | null;
  }>;
}) {
  if (!items.length) {
    return <EmptyState title="Sem profissionais ativos" description="Cadastre profissionais para acompanhar a carga do dia." />;
  }

  return (
    <div className="overflow-hidden rounded-[24px] border border-border bg-white">
      {items.map((item, index) => (
        <div key={item.id} className={`px-5 py-4 ${index !== items.length - 1 ? "border-b border-border" : ""}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-medium text-foreground">{item.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {item.appointmentsCount} atendimento{item.appointmentsCount === 1 ? "" : "s"} hoje
              </p>
            </div>
            <Badge variant="outline">{item.completedCount} concluído{item.completedCount === 1 ? "" : "s"}</Badge>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>{item.pendingCount} pendente{item.pendingCount === 1 ? "" : "s"}</span>
            <span className="text-border">•</span>
            <span>{item.nextStartAt ? `Próximo às ${format(item.nextStartAt, "HH:mm", { locale: ptBR })}` : "Sem próximo horário hoje"}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function TopServicesPanel({ items }: { items: Array<{ name: string; count: number; revenue: number }> }) {
  if (!items.length) {
    return <EmptyState title="Sem serviços vendidos no mês" description="Os serviços concluídos começarão a aparecer aqui." />;
  }

  return (
    <div className="overflow-hidden rounded-[24px] border border-border bg-white">
      {items.map((item, index) => (
        <div key={item.name} className={`flex items-center justify-between gap-4 px-5 py-4 ${index !== items.length - 1 ? "border-b border-border" : ""}`}>
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
      ))}
    </div>
  );
}

function AlertsPanel({
  items,
}: {
  items: Array<{ tone: "default" | "warning" | "danger"; title: string; description: string }>;
}) {
  if (!items.length) {
    return <EmptyState title="Tudo sob controle" description="Nenhum alerta crítico apareceu na operação por enquanto." />;
  }

  const toneClassMap = {
    default: "border-border bg-white",
    warning: "border-amber-200 bg-amber-50/70",
    danger: "border-rose-200 bg-rose-50/70",
  };

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.title} className={`rounded-[22px] border px-4 py-4 ${toneClassMap[item.tone]}`}>
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
            <div>
              <p className="font-medium text-foreground">{item.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
