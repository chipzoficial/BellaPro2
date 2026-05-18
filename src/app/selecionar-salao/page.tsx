import { chooseOrganizationAction } from "@/server/actions/auth";
import { requireUser } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";

export default async function SelecionarSalaoPage() {
  const user = await requireUser();

  return (
    <main className="min-h-screen bg-[#fbf6f5] px-4 py-10">
      <div className="container max-w-3xl">
        <h1 className="font-heading text-5xl font-semibold text-brand-800">Selecione o salão</h1>
        <p className="mt-2 text-sm text-muted-foreground">Escolha em qual salão deseja entrar agora.</p>
        <div className="mt-8 space-y-4">
          {user.memberships.map((membership) => (
            <form key={membership.id} action={chooseOrganizationAction.bind(null, membership.organizationId)} className="flex items-center justify-between rounded-2xl border border-border bg-white p-5">
              <div>
                <p className="font-semibold">{membership.organization.name}</p>
                <p className="text-sm text-muted-foreground">Perfil: {membership.role}</p>
              </div>
              <Button type="submit">Entrar</Button>
            </form>
          ))}
        </div>
      </div>
    </main>
  );
}
