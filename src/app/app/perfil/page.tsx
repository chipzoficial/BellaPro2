import { requireUser } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/page-header";
import { PerfilPage } from "@/components/app/perfil-page";

export default async function PerfilRoute() {
  const user = await requireUser();

  return (
    <div className="space-y-8">
      <PageHeader title="Perfil" description="Atualize seus dados e altere a senha de acesso ao BellaPro." />
      <PerfilPage user={user} />
    </div>
  );
}
