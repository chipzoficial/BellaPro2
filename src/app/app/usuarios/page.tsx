import { Role } from "@prisma/client";
import { getCurrentMembership } from "@/lib/auth/session";
import { getOrganizationUsers } from "@/server/queries/app";
import { PageHeader } from "@/components/shared/page-header";
import { UsuariosPage } from "@/components/app/usuarios-page";

export default async function UsuariosRoute() {
  const membership = await getCurrentMembership([Role.OWNER]);
  const users = await getOrganizationUsers(membership.organizationId);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Gerenciar usuários"
        description="Crie acessos para a equipe e ajuste os cargos do seu salão."
      />
      <UsuariosPage users={users} />
    </div>
  );
}
