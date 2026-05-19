import { Role } from "@prisma/client";
import { getCurrentMembership } from "@/lib/auth/session";
import { getOrganizationSummary } from "@/server/queries/app";
import { PageHeader } from "@/components/shared/page-header";
import { ProfissionaisPage } from "@/components/app/profissionais-page";

export default async function ProfissionaisRoute() {
  const membership = await getCurrentMembership([Role.OWNER, Role.MANAGER]);
  const summary = await getOrganizationSummary(membership.organizationId);

  return (
    <div className="space-y-8">
      <PageHeader title="Profissionais" description="Gerencie quem atende no salão e mantenha a equipe ativa sob controle." />
      <ProfissionaisPage professionals={summary.professionals} services={summary.services} />
    </div>
  );
}
