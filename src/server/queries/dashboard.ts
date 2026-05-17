import { AppointmentStatus } from "@prisma/client";
import { endOfDay, endOfMonth, startOfDay, startOfMonth } from "date-fns";
import { db } from "@/lib/db";

export async function getDashboardData(organizationId: string) {
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(todayStart);
  const monthStart = startOfMonth(todayStart);
  const monthEnd = endOfMonth(todayStart);

  const [todayAppointments, upcomingAppointments, clientsCount, professionalsCount, completedAppointments, monthAppointments] =
    await Promise.all([
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
          startAt: { gte: new Date() },
        },
        include: {
          client: true,
          professional: true,
          service: true,
        },
        orderBy: { startAt: "asc" },
        take: 6,
      }),
      db.client.count({ where: { organizationId } }),
      db.professional.count({ where: { organizationId, isActive: true } }),
      db.appointment.findMany({
        where: {
          organizationId,
          status: AppointmentStatus.COMPLETED,
          startAt: { gte: monthStart, lte: monthEnd },
        },
      }),
      db.appointment.findMany({
        where: {
          organizationId,
          startAt: { gte: monthStart, lte: monthEnd },
        },
      }),
    ]);

  const estimatedRevenue = completedAppointments.reduce((sum, item) => sum + item.priceInCents, 0);
  const attendanceStatuses = [AppointmentStatus.COMPLETED, AppointmentStatus.NO_SHOW] as AppointmentStatus[];
  const attendanceBase = monthAppointments.filter((item) => attendanceStatuses.includes(item.status));
  const attendanceRate = attendanceBase.length
    ? Math.round((attendanceBase.filter((item) => item.status === AppointmentStatus.COMPLETED).length / attendanceBase.length) * 100)
    : 0;

  return {
    todayAppointments,
    upcomingAppointments,
    metrics: {
      todayCount: todayAppointments.length,
      clientsCount,
      professionalsCount,
      estimatedRevenue,
      attendanceRate,
    },
  };
}
