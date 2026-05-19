import { Role } from "@prisma/client";
import { getCurrentMembership } from "@/lib/auth/session";
import { getClientsManagementData } from "@/server/queries/app";
import { PageHeader } from "@/components/shared/page-header";
import { ClientesPage } from "@/components/app/clientes-page";

export default async function ClientesRoute() {
  const membership = await getCurrentMembership([Role.OWNER, Role.MANAGER, Role.RECEPTIONIST]);
  const clients = await getClientsManagementData(membership.organizationId);

  return (
    <div className="space-y-8">
      <PageHeader title="Clientes" description="Gerencie sua base de clientes." />
      <ClientesPage initialClients={clients} />
    </div>
  );
}
