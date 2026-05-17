import { getCurrentMembership } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";

export default async function AdminPage() {
  await getCurrentMembership(["ADMIN_GLOBAL"]);
  return (
    <div className="space-y-8 p-8">
      <PageHeader title="Admin BellaPro" description="Área global preparada para evolução futura da plataforma." />
      <EmptyState title="Área admin preparada" description="As rotas globais de salões, usuários e planos já estão reservadas para evolução futura." />
    </div>
  );
}
