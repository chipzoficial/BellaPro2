import { AppointmentStatus } from "@prisma/client";
import { endOfDay, endOfMonth, format, isWithinInterval, startOfDay, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { db } from "@/lib/db";

const actionableStatuses: AppointmentStatus[] = [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED];
const attendanceStatuses: AppointmentStatus[] = [AppointmentStatus.COMPLETED, AppointmentStatus.NO_SHOW];

export async function getDashboardData(organizationId: string) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(todayStart);
  const monthStart = startOfMonth(todayStart);
  const monthEnd = endOfMonth(todayStart);

  const [
    organization,
    todayAppointments,
    upcomingAppointments,
    clientsCount,
    newClientsCount,
    professionals,
    monthAppointments,
  ] = await Promise.all([
    db.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { name: true, slug: true },
    }),
    db.appointment.findMany({
      where: {
        organizationId,
        startAt: { gte: todayStart, lte: todayEnd },
      },
      include: {
        client: true,
        professional: true,
        service: true,
      },
      orderBy: { startAt: "asc" },
    }),
    db.appointment.findMany({
      where: {
        organizationId,
        startAt: { gte: now },
        status: { in: [...actionableStatuses] },
      },
      include: {
        client: true,
        professional: true,
        service: true,
      },
      orderBy: { startAt: "asc" },
      take: 8,
    }),
    db.client.count({ where: { organizationId } }),
    db.client.count({
      where: {
        organizationId,
        createdAt: { gte: monthStart, lte: monthEnd },
      },
    }),
    db.professional.findMany({
      where: { organizationId, isActive: true },
      include: {
        professionalServices: {
          select: { id: true },
        },
        businessHours: {
          where: { isActive: true },
          select: { id: true },
        },
      },
      orderBy: { name: "asc" },
    }),
    db.appointment.findMany({
      where: {
        organizationId,
        startAt: { gte: monthStart, lte: monthEnd },
      },
      include: {
        client: true,
        professional: true,
        service: true,
      },
    }),
  ]);

  const completedAppointments = monthAppointments.filter((item) => item.status === AppointmentStatus.COMPLETED);
  const canceledAppointments = monthAppointments.filter((item) => item.status === AppointmentStatus.CANCELED);
  const pendingAppointments = monthAppointments.filter((item) => item.status === AppointmentStatus.PENDING);
  const attendanceBase = monthAppointments.filter((item) => attendanceStatuses.includes(item.status));
  const activeNow = todayAppointments.filter(
    (item) =>
      actionableStatuses.includes(item.status) &&
      isWithinInterval(now, {
        start: item.startAt,
        end: item.endAt,
      })
  );

  const estimatedRevenue = completedAppointments.reduce((sum, item) => sum + item.priceInCents, 0);
  const attendanceRate = attendanceBase.length
    ? Math.round((completedAppointments.length / attendanceBase.length) * 100)
    : 0;
  const ticketAverage = completedAppointments.length ? Math.round(estimatedRevenue / completedAppointments.length) : 0;
  const nextAppointment = upcomingAppointments[0] ?? null;
  const completedToday = todayAppointments.filter((item) => item.status === AppointmentStatus.COMPLETED).length;
  const pendingToday = todayAppointments.filter((item) => item.status === AppointmentStatus.PENDING).length;
  const freeProfessionalsNow = Math.max(professionals.length - activeNow.length, 0);

  const serviceLeaders = Object.values(
    completedAppointments.reduce<Record<string, { name: string; count: number; revenue: number }>>((acc, item) => {
      const key = item.serviceId;
      const current = acc[key] ?? { name: item.service.name, count: 0, revenue: 0 };
      current.count += 1;
      current.revenue += item.priceInCents;
      acc[key] = current;
      return acc;
    }, {})
  )
    .sort((a, b) => (b.count === a.count ? b.revenue - a.revenue : b.count - a.count))
    .slice(0, 4);

  const professionalsToday = professionals
    .map((professional) => {
      const todayItems = todayAppointments.filter((item) => item.professionalId === professional.id);
      const completed = todayItems.filter((item) => item.status === AppointmentStatus.COMPLETED).length;
      const pending = todayItems.filter((item) => item.status === AppointmentStatus.PENDING).length;
      const next = todayItems.find((item) => item.startAt >= now && actionableStatuses.includes(item.status));

      return {
        id: professional.id,
        name: professional.name,
        appointmentsCount: todayItems.length,
        completedCount: completed,
        pendingCount: pending,
        nextStartAt: next?.startAt ?? null,
      };
    })
    .sort((a, b) => b.appointmentsCount - a.appointmentsCount || a.name.localeCompare(b.name))
    .slice(0, 5);

  const professionalsWithoutServices = professionals.filter((professional) => !professional.professionalServices.length);
  const professionalsWithoutHours = professionals.filter((professional) => !professional.businessHours.length);

  const alerts = [
    pendingAppointments.length
      ? {
          tone: "warning" as const,
          title: `${pendingAppointments.length} agendamento${pendingAppointments.length > 1 ? "s" : ""} pendente${pendingAppointments.length > 1 ? "s" : ""}`,
          description: "Confirme os atendimentos pendentes para reduzir furos na agenda.",
        }
      : null,
    professionalsWithoutServices.length
      ? {
          tone: "default" as const,
          title: `${professionalsWithoutServices.length} profissional${professionalsWithoutServices.length > 1 ? "is" : ""} sem serviços vinculados`,
          description: "Revise os cadastros para evitar bloqueios ao criar novos agendamentos.",
        }
      : null,
    professionalsWithoutHours.length
      ? {
          tone: "default" as const,
          title: `${professionalsWithoutHours.length} profissional${professionalsWithoutHours.length > 1 ? "is" : ""} sem horário configurado`,
          description: "Defina a rotina de trabalho para liberar disponibilidade de agenda corretamente.",
        }
      : null,
    !completedAppointments.length
      ? {
          tone: "danger" as const,
          title: "Nenhum atendimento concluído no mês",
          description: "Sem serviços concluídos, o faturamento do mês ainda não começou a aparecer.",
        }
      : null,
  ].filter((item): item is { tone: "default" | "warning" | "danger"; title: string; description: string } => Boolean(item));

  const busiestDayLabel = (() => {
    const dayBuckets = monthAppointments.reduce<Record<string, number>>((acc, item) => {
      const key = format(item.startAt, "EEEE", { locale: ptBR });
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
    const winner = Object.entries(dayBuckets).sort((a, b) => b[1] - a[1])[0];
    if (!winner) return "Sem volume suficiente";
    return `${winner[0][0].toUpperCase()}${winner[0].slice(1)} com ${winner[1]} agendamento${winner[1] > 1 ? "s" : ""}`;
  })();

  return {
    organization,
    nextAppointment,
    todayAppointments,
    upcomingAppointments,
    professionalsToday,
    serviceLeaders,
    alerts,
    metrics: {
      today: {
        appointmentsCount: todayAppointments.length,
        completedCount: completedToday,
        pendingCount: pendingToday,
        activeNowCount: activeNow.length,
        freeProfessionalsNow,
      },
      month: {
        clientsCount,
        newClientsCount,
        professionalsCount: professionals.length,
        estimatedRevenue,
        attendanceRate,
        ticketAverage,
        canceledCount: canceledAppointments.length,
        completedCount: completedAppointments.length,
        busiestDayLabel,
      },
    },
  };
}
