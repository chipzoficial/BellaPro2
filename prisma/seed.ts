import { addDays, addHours, set } from "date-fns";
import { AppointmentStatus, Role, SubscriptionStatus, WeekDay } from "@prisma/client";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";

async function main() {
  const ownerEmail = "owner@bellapro.local";
  const ownerPasswordHash = await hashPassword("12345678");

  await db.appointment.deleteMany();
  await db.blockedTime.deleteMany();
  await db.businessHour.deleteMany();
  await db.professionalService.deleteMany();
  await db.client.deleteMany();
  await db.service.deleteMany();
  await db.professional.deleteMany();
  await db.membership.deleteMany();
  await db.subscription.deleteMany();
  await db.subscriptionPlan.deleteMany();
  await db.organization.deleteMany();
  await db.user.deleteMany({
    where: {
      email: ownerEmail,
    },
  });

  const owner = await db.user.create({
    data: {
      name: "Dono BellaPro",
      email: ownerEmail,
      phone: "(11) 99999-1111",
      passwordHash: ownerPasswordHash,
    },
  });

  const organization = await db.organization.create({
    data: {
      name: "Bella Studio",
      slug: "meu-salao",
      phone: "(11) 4002-8922",
      city: "São Paulo",
      state: "SP",
      address: "Rua das Flores, 123",
      email: "contato@bellastudio.local",
    },
  });

  await db.membership.create({
    data: {
      userId: owner.id,
      organizationId: organization.id,
      role: Role.OWNER,
    },
  });

  const [basePlan] = await Promise.all(
    [
      {
        name: "Base",
        description: "Ideal para autônomos e salões em início de operação.",
        priceInCents: 3700,
        maxProfessionals: 5,
        maxAppointmentsPerMonth: 300,
      },
      {
        name: "Studio",
        description: "Ideal para salões em crescimento com rotina intensa.",
        priceInCents: 6700,
        maxProfessionals: 10,
        maxAppointmentsPerMonth: 1000,
      },
      {
        name: "Elevate",
        description: "Ideal para operações maiores e equipes com alta demanda.",
        priceInCents: 14700,
        maxProfessionals: 20,
        maxAppointmentsPerMonth: null,
      },
    ].map((plan) =>
      db.subscriptionPlan.create({
        data: plan,
      })
    )
  );

  await db.subscription.create({
    data: {
      organizationId: organization.id,
      planId: basePlan.id,
      status: SubscriptionStatus.TRIALING,
      currentPeriodStart: new Date(),
      currentPeriodEnd: addDays(new Date(), 14),
    },
  });

  const professionals = await Promise.all(
    ["Ana Souza", "Camila Rocha", "Mariana Lima"].map((name, index) =>
      db.professional.create({
        data: {
          organizationId: organization.id,
          name,
          phone: `(11) 98888-10${index}`,
          email: `${name.toLowerCase().replace(/\s+/g, ".")}@bellastudio.local`,
          bio: "Profissional cadastrada para o ambiente de desenvolvimento.",
        },
      })
    )
  );

  const servicesData = [
    { name: "Corte feminino", durationMinutes: 60, priceInCents: 9000 },
    { name: "Escova", durationMinutes: 45, priceInCents: 6500 },
    { name: "Manicure", durationMinutes: 45, priceInCents: 4000 },
    { name: "Pedicure", durationMinutes: 60, priceInCents: 5000 },
    { name: "Alongamento de unhas", durationMinutes: 90, priceInCents: 12000 },
    { name: "Design de sobrancelhas", durationMinutes: 30, priceInCents: 3500 },
    { name: "Hidratação capilar", durationMinutes: 75, priceInCents: 8500 },
    { name: "Maquiagem", durationMinutes: 90, priceInCents: 15000 },
  ];

  const services = await Promise.all(
    servicesData.map((service) =>
      db.service.create({
        data: {
          organizationId: organization.id,
          description: `${service.name} no catálogo inicial do BellaPro.`,
          ...service,
        },
      })
    )
  );

  const professionalServicePairs = [
    [professionals[0], services[0]],
    [professionals[0], services[1]],
    [professionals[0], services[6]],
    [professionals[1], services[2]],
    [professionals[1], services[3]],
    [professionals[1], services[4]],
    [professionals[2], services[5]],
    [professionals[2], services[7]],
    [professionals[2], services[1]],
  ];

  await db.professionalService.createMany({
    data: professionalServicePairs.map(([professional, service]) => ({
      professionalId: professional.id,
      serviceId: service.id,
    })),
  });

  const weekDays = [
    WeekDay.MONDAY,
    WeekDay.TUESDAY,
    WeekDay.WEDNESDAY,
    WeekDay.THURSDAY,
    WeekDay.FRIDAY,
    WeekDay.SATURDAY,
  ];

  await db.businessHour.createMany({
    data: weekDays.flatMap((weekDay) => [
      {
        organizationId: organization.id,
        weekDay,
        startTime: "09:00",
        endTime: "19:00",
        isActive: true,
      },
      ...professionals.map((professional) => ({
        organizationId: organization.id,
        professionalId: professional.id,
        weekDay,
        startTime: "09:00",
        endTime: "18:00",
        isActive: true,
      })),
    ]),
  });

  const clients = await Promise.all(
    Array.from({ length: 20 }).map((_, index) =>
      db.client.create({
        data: {
          organizationId: organization.id,
          name: `Cliente ${index + 1}`,
          phone: `(11) 97777-${String(index).padStart(4, "0")}`,
          email: `cliente${index + 1}@bellapro.local`,
          notes: index % 3 === 0 ? "Cliente gosta de horários no início da tarde." : null,
        },
      })
    )
  );

  const appointmentRows = Array.from({ length: 18 }).map((_, index) => {
    const professional = professionals[index % professionals.length];
    const linkedService =
      (professionalServicePairs.find(([pairProfessional]) => pairProfessional.id === professional.id)?.[1] as
        | (typeof services)[number]
        | undefined) ?? services[0];
    const client = clients[index % clients.length];
    const day = addDays(new Date(), (index % 6) + 1);
    const startAt = set(day, {
      hours: 9 + (index % 5) * 2,
      minutes: 0,
      seconds: 0,
      milliseconds: 0,
    });
    const endAt = addHours(startAt, Math.max(1, Math.round(linkedService.durationMinutes / 60)));
    const statusCycle = [
      AppointmentStatus.CONFIRMED,
      AppointmentStatus.PENDING,
      AppointmentStatus.COMPLETED,
      AppointmentStatus.CONFIRMED,
      AppointmentStatus.CANCELED,
      AppointmentStatus.NO_SHOW,
    ];

    return {
      organizationId: organization.id,
      clientId: client.id,
      professionalId: professional.id,
      serviceId: linkedService.id,
      startAt,
      endAt,
      status: statusCycle[index % statusCycle.length],
      priceInCents: linkedService.priceInCents,
      notes: index % 4 === 0 ? "Agendamento gerado pelo seed." : null,
      cancellationReason: index % 6 === 4 ? "Imprevisto da cliente" : null,
    };
  });

  await db.appointment.createMany({
    data: appointmentRows,
  });

  console.log("Seed do BellaPro concluído.");
  console.log(`Owner: ${ownerEmail}`);
  console.log("Senha: 12345678");
  console.log(`Slug público: ${organization.slug}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
