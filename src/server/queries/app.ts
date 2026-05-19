import { AppointmentStatus } from "@prisma/client";
import { addDays, endOfDay, endOfMonth, endOfYear, startOfDay, startOfMonth, startOfYear, subDays } from "date-fns";
import { db } from "@/lib/db";

export type FinancialPeriod = "month" | "last_30_days" | "last_90_days" | "year";

export async function getOrganizationSummary(organizationId: string) {
  const currentMonthStart = startOfMonth(new Date());
  const currentMonthEnd = endOfMonth(new Date());

  const [services, professionals, clients, appointments, monthAppointments] = await Promise.all([
    db.service.findMany({
      where: { organizationId },
      include: {
        professionalServices: {
          include: {
            professional: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.professional.findMany({
      where: { organizationId },
      include: {
        professionalServices: {
          include: {
            service: true,
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    db.client.findMany({
      where: { organizationId },
      orderBy: { updatedAt: "desc" },
    }),
    db.appointment.findMany({
      where: {
        organizationId,
        startAt: {
          gte: startOfDay(addDays(new Date(), -7)),
        },
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
        startAt: {
          gte: currentMonthStart,
          lte: currentMonthEnd,
        },
      },
      include: {
        client: true,
        professional: true,
        service: true,
      },
      orderBy: { startAt: "asc" },
    }),
  ]);

  const completedThisMonth = monthAppointments.filter((item) => item.status === AppointmentStatus.COMPLETED);
  const canceledThisMonth = monthAppointments.filter((item) => item.status === AppointmentStatus.CANCELED);
  const noShowThisMonth = monthAppointments.filter((item) => item.status === AppointmentStatus.NO_SHOW);
  const topServices = Object.values(
    completedThisMonth.reduce<Record<string, { name: string; count: number; revenue: number }>>((acc, item) => {
      const current = acc[item.service.name] ?? { name: item.service.name, count: 0, revenue: 0 };
      current.count += 1;
      current.revenue += item.priceInCents;
      acc[item.service.name] = current;
      return acc;
    }, {})
  ).sort((a, b) => (b.count === a.count ? b.revenue - a.revenue : b.count - a.count));

  return {
    services,
    professionals,
    clients,
    appointments,
    financial: {
      revenue: completedThisMonth.reduce((total, item) => total + item.priceInCents, 0),
      completedCount: completedThisMonth.length,
      canceledCount: canceledThisMonth.length,
      noShowCount: noShowThisMonth.length,
      topServices,
    },
  };
}

function getFinancialRange(period: FinancialPeriod) {
  const now = new Date();

  switch (period) {
    case "last_30_days":
      return {
        start: startOfDay(subDays(now, 29)),
        end: endOfDay(now),
      };
    case "last_90_days":
      return {
        start: startOfDay(subDays(now, 89)),
        end: endOfDay(now),
      };
    case "year":
      return {
        start: startOfYear(now),
        end: endOfYear(now),
      };
    case "month":
    default:
      return {
        start: startOfMonth(now),
        end: endOfMonth(now),
      };
  }
}

export async function getFinancialOverview(organizationId: string, period: FinancialPeriod) {
  const range = getFinancialRange(period);

  const appointments = await db.appointment.findMany({
    where: {
      organizationId,
      startAt: {
        gte: range.start,
        lte: range.end,
      },
    },
    include: {
      client: true,
      professional: true,
      service: true,
    },
    orderBy: { startAt: "asc" },
  });

  const completed = appointments.filter((item) => item.status === AppointmentStatus.COMPLETED);
  const canceled = appointments.filter((item) => item.status === AppointmentStatus.CANCELED);
  const noShow = appointments.filter((item) => item.status === AppointmentStatus.NO_SHOW);
  const topServices = Object.values(
    completed.reduce<Record<string, { name: string; count: number; revenue: number }>>((acc, item) => {
      const current = acc[item.service.name] ?? { name: item.service.name, count: 0, revenue: 0 };
      current.count += 1;
      current.revenue += item.priceInCents;
      acc[item.service.name] = current;
      return acc;
    }, {})
  ).sort((a, b) => (b.count === a.count ? b.revenue - a.revenue : b.count - a.count));

  return {
    period,
    range,
    revenue: completed.reduce((total, item) => total + item.priceInCents, 0),
    completedCount: completed.length,
    canceledCount: canceled.length,
    noShowCount: noShow.length,
    topServices,
  };
}

export async function getAppointmentManagementData(organizationId: string) {
  const [services, professionals, clients, appointments] = await Promise.all([
    db.service.findMany({
      where: { organizationId },
      include: {
        professionalServices: {
          include: {
            professional: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.professional.findMany({
      where: { organizationId },
      include: {
        professionalServices: {
          include: {
            service: true,
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    db.client.findMany({
      where: { organizationId },
      orderBy: { updatedAt: "desc" },
    }),
    db.appointment.findMany({
      where: {
        organizationId,
      },
      include: {
        client: true,
        professional: true,
        service: true,
      },
      orderBy: { startAt: "desc" },
    }),
  ]);

  return {
    services,
    professionals,
    clients,
    appointments,
  };
}

export async function getClientsManagementData(organizationId: string) {
  return db.client.findMany({
    where: { organizationId },
    include: {
      appointments: {
        include: {
          professional: true,
          service: true,
        },
        orderBy: { startAt: "desc" },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getAgendaDay(organizationId: string, date: Date, professionalId?: string) {
  return db.appointment.findMany({
    where: {
      organizationId,
      startAt: {
        gte: startOfDay(date),
        lte: endOfDay(date),
      },
      ...(professionalId ? { professionalId } : {}),
    },
    include: {
      client: true,
      professional: true,
      service: true,
    },
    orderBy: { startAt: "asc" },
  });
}

export async function getAgendaWorkspace(organizationId: string, startDate: Date, endDate: Date) {
  const [appointments, professionals] = await Promise.all([
    db.appointment.findMany({
      where: {
        organizationId,
        startAt: {
          gte: startOfDay(startDate),
          lte: endOfDay(endDate),
        },
      },
      include: {
        client: true,
        professional: true,
        service: true,
      },
      orderBy: [{ startAt: "asc" }, { professional: { name: "asc" } }],
    }),
    db.professional.findMany({
      where: {
        organizationId,
        isActive: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    appointments,
    professionals,
  };
}

export async function getPublicOrganizationBySlug(slug: string) {
  return db.organization.findUnique({
    where: { slug },
    include: {
      professionals: {
        where: { isActive: true },
        include: {
          professionalServices: {
            include: {
              service: true,
            },
          },
        },
      },
      services: {
        where: { isActive: true },
      },
      businessHours: true,
    },
  });
}
