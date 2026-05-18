import Link from "next/link";
import { Role } from "@prisma/client";
import { getCurrentMembership } from "@/lib/auth/session";
import { getRequestOrigin } from "@/lib/request-origin";
import { PageHeader } from "@/components/shared/page-header";
import { ConfiguracoesPage } from "@/components/app/configuracoes-page";
import { Button } from "@/components/ui/button";

export default async function ConfiguracoesRoute() {
  const membership = await getCurrentMembership();
  const publicBaseUrl = await getRequestOrigin();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Configurações"
        description="Atualize os dados do salão, o link público de agendamento e a cobrança recorrente."
        action={
          membership.role === Role.OWNER ? (
            <Button asChild variant="outline">
              <Link href="/app/assinatura">Cobrança e assinatura</Link>
            </Button>
          ) : null
        }
      />
      <ConfiguracoesPage organization={membership.organization} publicBaseUrl={publicBaseUrl} />
    </div>
  );
}
