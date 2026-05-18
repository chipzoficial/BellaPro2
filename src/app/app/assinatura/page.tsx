import { Role } from "@prisma/client";
import { getCurrentMembership } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/page-header";
import { AssinaturaPage } from "@/components/app/assinatura-page";
import { getBillingOverview } from "@/server/queries/billing";

export default async function AssinaturaRoute() {
  const membership = await getCurrentMembership([Role.OWNER]);
  const overview = await getBillingOverview(membership.organizationId);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Assinatura"
        description="Gerencie o plano do BellaPro, a cobrança recorrente e o portal da Stripe."
      />
      <AssinaturaPage overview={overview} />
    </div>
  );
}
