import { getCurrentMembership } from "@/lib/auth/session";
import { getDashboardData } from "@/server/queries/dashboard";
import { PageHeader } from "@/components/shared/page-header";
import { SectionHeader } from "@/components/shared/section-header";
import { MetricCard } from "@/components/dashboard/metric-card";
import { TodayAppointments } from "@/components/dashboard/today-appointments";
import { UpcomingAppointments } from "@/components/dashboard/upcoming-appointments";
import { formatMoney } from "@/lib/utils";

export default async function DashboardPage() {
  const membership = await getCurrentMembership();
  const data = await getDashboardData(membership.organizationId);

  return (
    <div className="space-y-8">
      <PageHeader title="Dashboard" description="Visão rápida do salão, da agenda e do ritmo do mês." />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Agendamentos hoje" value={String(data.metrics.todayCount)} />
        <MetricCard label="Clientes" value={String(data.metrics.clientsCount)} />
        <MetricCard label="Profissionais ativos" value={String(data.metrics.professionalsCount)} />
        <MetricCard label="Faturamento do mês" value={formatMoney(data.metrics.estimatedRevenue)} />
        <MetricCard label="Taxa de comparecimento" value={`${data.metrics.attendanceRate}%`} />
      </section>
      <section>
        <SectionHeader title="Agenda de hoje" description="Acompanhe o que está acontecendo no salão agora." />
        <TodayAppointments items={data.todayAppointments} />
      </section>
      <section>
        <SectionHeader title="Próximos agendamentos" description="Os próximos horários confirmados e pendentes aparecem aqui." />
        <UpcomingAppointments items={data.upcomingAppointments} />
      </section>
    </div>
  );
}
