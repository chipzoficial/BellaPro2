import Link from "next/link";
import { SubscriptionStatus } from "@prisma/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getCurrentMembership } from "@/lib/auth/session";
import { getAdminOverview } from "@/server/queries/admin";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function getSubscriptionBadge(status: SubscriptionStatus) {
  if (status === SubscriptionStatus.ACTIVE) return <Badge variant="success">Ativa</Badge>;
  if (status === SubscriptionStatus.TRIALING) return <Badge>Teste</Badge>;
  if (status === SubscriptionStatus.PAST_DUE) return <Badge variant="warning">Em atraso</Badge>;
  if (status === SubscriptionStatus.CANCELED) return <Badge variant="secondary">Cancelada</Badge>;
  return <Badge variant="outline">Expirada</Badge>;
}

export default async function AdminPage() {
  await getCurrentMembership(["ADMIN_GLOBAL"]);
  const data = await getAdminOverview();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Admin BellaPro"
        description="Leitura rápida da operação da plataforma."
        action={
          <>
            <Button asChild variant="outline">
              <Link href="/admin/saloes">Salões</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/usuarios">Usuários</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/planos">Planos</Link>
            </Button>
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-3xl border border-border bg-white p-5">
          <p className="text-sm text-muted-foreground">Salões</p>
          <p className="mt-2 text-3xl font-semibold text-foreground">{data.metrics.organizations}</p>
          <p className="mt-1 text-sm text-muted-foreground">{data.metrics.activeOrganizations} ativos no momento</p>
        </div>
        <div className="rounded-3xl border border-border bg-white p-5">
          <p className="text-sm text-muted-foreground">Usuários</p>
          <p className="mt-2 text-3xl font-semibold text-foreground">{data.metrics.users}</p>
          <p className="mt-1 text-sm text-muted-foreground">Base total cadastrada</p>
        </div>
        <div className="rounded-3xl border border-border bg-white p-5">
          <p className="text-sm text-muted-foreground">Assinaturas ativas</p>
          <p className="mt-2 text-3xl font-semibold text-foreground">{data.metrics.activeSubscriptions}</p>
          <p className="mt-1 text-sm text-muted-foreground">{data.metrics.activeTrials} em teste • {data.metrics.pastDueSubscriptions} em atraso</p>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-white p-5 md:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Salões recentes</h2>
            <p className="mt-1 text-sm text-muted-foreground">Visão rápida de crescimento e status do SaaS.</p>
          </div>
          <Button asChild variant="ghost">
            <Link href="/admin/saloes">Ver tudo</Link>
          </Button>
        </div>

        <div className="mt-5">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Salão</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Uso</TableHead>
                <TableHead>Criado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.organizations.map((organization) => {
                const subscription = organization.subscriptions[0] ?? null;
                return (
                  <TableRow key={organization.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">{organization.name}</p>
                        <p className="text-sm text-muted-foreground">/{organization.slug}</p>
                      </div>
                    </TableCell>
                    <TableCell>{subscription?.plan.name ?? "Sem plano"}</TableCell>
                    <TableCell>{subscription ? getSubscriptionBadge(subscription.status) : <Badge variant="outline">Sem assinatura</Badge>}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {organization._count.professionals} profissionais • {organization._count.clients} clientes
                    </TableCell>
                    <TableCell>{format(organization.createdAt, "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-white p-5 md:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Assinaturas em aberto</h2>
            <p className="mt-1 text-sm text-muted-foreground">Teste, cobrança ativa e contas em atraso.</p>
          </div>
          <Button asChild variant="ghost">
            <Link href="/admin/planos">Ver planos</Link>
          </Button>
        </div>

        <div className="mt-5 space-y-3">
          {data.recentSubscriptions.map((subscription) => (
            <div key={subscription.id} className="flex flex-col gap-2 rounded-2xl border border-border px-4 py-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-medium text-foreground">{subscription.organization.name}</p>
                <p className="text-sm text-muted-foreground">{subscription.plan.name} • vence em {format(subscription.currentPeriodEnd, "dd/MM/yyyy", { locale: ptBR })}</p>
              </div>
              {getSubscriptionBadge(subscription.status)}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
