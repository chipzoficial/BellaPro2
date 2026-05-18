import { getCurrentMembership } from "@/lib/auth/session";
import { getOrganizationSummary } from "@/server/queries/app";
import { PageHeader } from "@/components/shared/page-header";
import { ClientesPage } from "@/components/app/clientes-page";

export default async function ClientesRoute() {
  const membership = await getCurrentMembership();
  const summary = await getOrganizationSummary(membership.organizationId);

  return (
    <div className="space-y-8">
      <PageHeader title="Clientes" description="Gerencie sua base de clientes." />
      <ClientesPage initialClients={summary.clients} />
    </div>
  );
}
