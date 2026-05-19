import Link from "next/link";
import { Role } from "@prisma/client";
import { getCurrentMembership } from "@/lib/auth/session";
import { getRequestOrigin } from "@/lib/request-origin";
import { PageHeader } from "@/components/shared/page-header";
import { ConfiguracoesPage } from "@/components/app/configuracoes-page";
import { Button } from "@/components/ui/button";

export default async function ConfiguracoesRoute() {
  const membership = await getCurrentMembership([Role.OWNER]);
  const publicBaseUrl = await getRequestOrigin();
  const actions = [];

  if (membership.role === Role.OWNER) {
    actions.push(
      <Button key="users" asChild variant="outline">
        <Link href="/app/usuarios">Gerenciar usuários</Link>
      </Button>
    );
    actions.push(
      <Button key="billing" asChild variant="outline">
        <Link href="/app/assinatura">Cobrança e assinatura</Link>
      </Button>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Configurações"
        description="Ajuste os dados do salão e a página de agendamento."
        action={actions.length ? actions : null}
      />
      <ConfiguracoesPage organization={membership.organization} publicBaseUrl={publicBaseUrl} />
    </div>
  );
}
