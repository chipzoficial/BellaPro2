import { AppointmentStatus } from "@prisma/client";
import { addDays, endOfDay, endOfMonth, startOfDay, startOfMonth } from "date-fns";
import { db } from "@/lib/db";

export async function getOrganizationSummary(organizationId: string) {
  const currentMonthStart = startOfMonth(new Date());
  const currentMonthEnd = endOfMonth(new Date());

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
  ]);

  const completedThisMonth = appointments.filter(
    (item) =>
      item.status === AppointmentStatus.COMPLETED &&
      item.startAt >= currentMonthStart &&
      item.startAt <= currentMonthEnd
  );

  return {
    services,
    professionals,
    clients,
    appointments,
    financial: {
      revenue: completedThisMonth.reduce((total, item) => total + item.priceInCents, 0),
      completedCount: completedThisMonth.length,
    },
  };
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
