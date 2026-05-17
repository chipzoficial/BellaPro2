import { notFound } from "next/navigation";
import { getAvailableSlots } from "@/lib/availability";
import { getPublicOrganizationBySlug } from "@/server/queries/app";
import { Card, CardContent } from "@/components/ui/card";
import { PublicBookingFlow } from "@/components/public-booking/public-booking-flow";
import { EmptyState } from "@/components/shared/empty-state";

export default async function PublicSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const organization = await getPublicOrganizationBySlug(slug);

  if (!organization) {
    notFound();
  }

  if (!organization.isActive) {
    return (
      <main className="min-h-screen bg-[#fbf6f5] px-4 py-10">
        <div className="container max-w-3xl">
          <EmptyState title="Agendamento temporariamente indisponível" description="Este salão está inativo no momento. Tente novamente mais tarde." />
        </div>
      </main>
    );
  }

  const firstService = organization.services[0];
  const slots = firstService
    ? await getAvailableSlots({
        organizationId: organization.id,
        serviceId: firstService.id,
        date: new Date(),
      })
    : [];

  return (
    <main className="min-h-screen bg-[#fbf6f5] px-4 py-10">
      <div className="container max-w-5xl">
        <div className="mb-8">
          <p className="font-heading text-5xl font-semibold text-brand-800">{organization.name}</p>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Agende seu horário de forma prática. Escolha o serviço, a profissional e confirme seus dados.</p>
        </div>
        {organization.services.length ? (
          <Card>
            <CardContent className="p-8">
              <PublicBookingFlow
                slug={organization.slug}
                services={organization.services.map((service) => ({ id: service.id, name: service.name }))}
                professionals={organization.professionals.map((professional) => ({ id: professional.id, name: professional.name }))}
                slots={slots}
              />
            </CardContent>
          </Card>
        ) : (
          <EmptyState title="Sem horários disponíveis" description="O salão ainda não publicou serviços ativos para o agendamento online." />
        )}
      </div>
    </main>
  );
}
