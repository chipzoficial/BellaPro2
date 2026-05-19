import { getCurrentMembership } from "@/lib/auth/session";
import { formatMoney } from "@/lib/utils";
import { getAdminPlans } from "@/server/queries/admin";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function AdminPlanosPage() {
  await getCurrentMembership(["ADMIN_GLOBAL"]);
  const plans = await getAdminPlans();

  return (
    <div className="space-y-8">
      <PageHeader title="Planos" description="Leia adesão, cobrança e limites da estrutura comercial do BellaPro." />

      <section className="rounded-3xl border border-border bg-white p-5 md:p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plano</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead>Limites</TableHead>
              <TableHead>Assinaturas</TableHead>
              <TableHead>Integração</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.map((plan) => (
              <TableRow key={plan.id}>
                <TableCell>
                  <div>
                    <p className="font-medium text-foreground">{plan.name}</p>
                    <p className="text-sm text-muted-foreground">{plan.description || "Sem descrição"}</p>
                  </div>
                </TableCell>
                <TableCell>{formatMoney(plan.priceInCents)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {plan.maxProfessionals ? `${plan.maxProfessionals} profissionais` : "Sem limite de profissionais"}
                  <br />
                  {plan.maxAppointmentsPerMonth ? `${plan.maxAppointmentsPerMonth} agendamentos/mês` : "Sem limite de agendamentos"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {plan.subscriptionCount} total • {plan.billableCount} pagas • {plan.trialCount} em teste
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    {plan.isActive ? <Badge variant="success">Ativo</Badge> : <Badge variant="secondary">Inativo</Badge>}
                    {plan.stripePriceId ? <Badge variant="outline">Stripe ok</Badge> : <Badge variant="warning">Sem Stripe</Badge>}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
