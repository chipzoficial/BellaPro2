import { Role } from "@prisma/client";
import { getCurrentMembership } from "@/lib/auth/session";
import { getOrganizationSummary } from "@/server/queries/app";
import { PageHeader } from "@/components/shared/page-header";
import { ServicosPage } from "@/components/app/servicos-page";

export default async function ServicosRoute() {
  const membership = await getCurrentMembership([Role.OWNER, Role.MANAGER]);
  const summary = await getOrganizationSummary(membership.organizationId);

  return (
    <div className="space-y-8">
      <PageHeader title="Serviços" description="Monte o catálogo com preço, duração e disponibilidade operacional." />
      <ServicosPage services={summary.services} professionals={summary.professionals} />
    </div>
  );
}
