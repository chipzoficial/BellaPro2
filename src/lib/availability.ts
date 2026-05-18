import {
  AppointmentStatus,
  type BlockedTime,
  type BusinessHour,
  type Professional,
  type Service,
  WeekDay,
} from "@prisma/client";
import { addMinutes, endOfDay, format, isBefore, max, parse, set } from "date-fns";
import { db } from "@/lib/db";

type Slot = {
  time: string;
  professionalId: string;
  professionalName: string;
};

const weekdays: WeekDay[] = [
  WeekDay.SUNDAY,
  WeekDay.MONDAY,
  WeekDay.TUESDAY,
  WeekDay.WEDNESDAY,
  WeekDay.THURSDAY,
  WeekDay.FRIDAY,
  WeekDay.SATURDAY,
];

function parseTimeOnDate(date: Date, time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return set(date, { hours, minutes, seconds: 0, milliseconds: 0 });
}

function overlaps(startA: Date, endA: Date, startB: Date, endB: Date) {
  return startA < endB && endA > startB;
}

function isInBusinessHours(date: Date, service: Service, hours: BusinessHour[]) {
  const endAt = addMinutes(date, service.durationMinutes);
  return hours.some((hour) => {
    if (!hour.isActive) return false;
    const start = parseTimeOnDate(date, hour.startTime);
    const end = parseTimeOnDate(date, hour.endTime);
    return date >= start && endAt <= end;
  });
}

function isBlocked(date: Date, service: Service, blockedTimes: BlockedTime[]) {
  const endAt = addMinutes(date, service.durationMinutes);
  return blockedTimes.some((blocked) => overlaps(date, endAt, blocked.startAt, blocked.endAt));
}

export async function getAvailableSlots({
  organizationId,
  serviceId,
  professionalId,
  date,
  currentAppointmentId,
}: {
  organizationId: string;
  serviceId: string;
  professionalId?: string;
  date: Date;
  currentAppointmentId?: string;
}) {
  const service = await db.service.findFirst({
    where: {
      id: serviceId,
      organizationId,
      isActive: true,
    },
  });

  if (!service) return [];

  const professionals = await db.professional.findMany({
    where: {
      organizationId,
      isActive: true,
      ...(professionalId ? { id: professionalId } : {}),
      professionalServices: {
        some: {
          serviceId,
        },
      },
    },
    include: {
      businessHours: true,
      blockedTimes: {
        where: {
          startAt: {
            lte: endOfDay(date),
          },
          endAt: {
            gte: date,
          },
        },
      },
      appointments: {
        where: {
          ...(currentAppointmentId ? { id: { not: currentAppointmentId } } : {}),
          startAt: {
            gte: date,
            lte: endOfDay(date),
          },
          status: {
            in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, AppointmentStatus.COMPLETED],
          },
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  return professionals.flatMap((professional) =>
    buildProfessionalSlots({
      date,
      professional,
      service,
    })
  );
}

function buildProfessionalSlots({
  date,
  professional,
  service,
}: {
  date: Date;
  professional: Professional & {
    businessHours: BusinessHour[];
    blockedTimes: BlockedTime[];
    appointments: { startAt: Date; endAt: Date }[];
  };
  service: Service;
}): Slot[] {
  const weekDay = weekdays[date.getDay()];
  const hours = professional.businessHours.filter((hour) => hour.weekDay === weekDay);
  if (!hours.length) return [];

  const slots: Slot[] = [];
  const now = new Date();

  for (const hour of hours) {
    let cursor = parseTimeOnDate(date, hour.startTime);
    const endBoundary = parseTimeOnDate(date, hour.endTime);

    while (addMinutes(cursor, service.durationMinutes) <= endBoundary) {
      const slotEnd = addMinutes(cursor, service.durationMinutes);
      const hasConflict = professional.appointments.some((appointment) => overlaps(cursor, slotEnd, appointment.startAt, appointment.endAt));

      if (
        !isBefore(cursor, max([now, date])) &&
        isInBusinessHours(cursor, service, [hour]) &&
        !isBlocked(cursor, service, professional.blockedTimes) &&
        !hasConflict
      ) {
        slots.push({
          time: format(cursor, "HH:mm"),
          professionalId: professional.id,
          professionalName: professional.name,
        });
      }

      cursor = addMinutes(cursor, 30);
    }
  }

  return slots;
}

export function buildStartDate(date: string, time: string) {
  return parse(`${date} ${time}`, "yyyy-MM-dd HH:mm", new Date());
}
