import { getCurrentMembership } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/page-header";
import { ConfiguracoesPage } from "@/components/app/configuracoes-page";

export default async function ConfiguracoesRoute() {
  const membership = await getCurrentMembership();

  return (
    <div className="space-y-8">
      <PageHeader title="Configurações" description="Atualize os dados do salão e gerencie o link público de agendamento." />
      <ConfiguracoesPage organization={membership.organization} />
    </div>
  );
}
