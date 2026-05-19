import { SubscriptionStatus } from "@prisma/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getCurrentMembership } from "@/lib/auth/session";
import { getAdminOrganizations } from "@/server/queries/admin";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function getSubscriptionBadge(status: SubscriptionStatus) {
  if (status === SubscriptionStatus.ACTIVE) return <Badge variant="success">Ativa</Badge>;
  if (status === SubscriptionStatus.TRIALING) return <Badge>Teste</Badge>;
  if (status === SubscriptionStatus.PAST_DUE) return <Badge variant="warning">Em atraso</Badge>;
  if (status === SubscriptionStatus.CANCELED) return <Badge variant="secondary">Cancelada</Badge>;
  return <Badge variant="outline">Expirada</Badge>;
}

export default async function AdminSaloesPage() {
  await getCurrentMembership(["ADMIN_GLOBAL"]);
  const organizations = await getAdminOrganizations();

  return (
    <div className="space-y-8">
      <PageHeader title="Salões" description="Acompanhe o uso e o status comercial de cada conta." />

      <section className="rounded-3xl border border-border bg-white p-5 md:p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Salão</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Uso</TableHead>
              <TableHead>Atualizado em</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {organizations.map((organization) => {
              const subscription = organization.subscriptions[0] ?? null;
              return (
                <TableRow key={organization.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-foreground">{organization.name}</p>
                      <p className="text-sm text-muted-foreground">/{organization.slug}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {organization.email || organization.phone || "Sem contato definido"}
                  </TableCell>
                  <TableCell>{subscription?.plan.name ?? "Sem plano"}</TableCell>
                  <TableCell>{subscription ? getSubscriptionBadge(subscription.status) : <Badge variant="outline">Sem assinatura</Badge>}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {organization._count.professionals} profissionais • {organization._count.clients} clientes • {organization._count.appointments} atendimentos
                  </TableCell>
                  <TableCell>{format(organization.updatedAt, "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
