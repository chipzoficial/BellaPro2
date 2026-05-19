import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getCurrentMembership } from "@/lib/auth/session";
import { getAdminUsers, getRoleLabel } from "@/server/queries/admin";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function AdminUsuariosPage() {
  await getCurrentMembership(["ADMIN_GLOBAL"]);
  const users = await getAdminUsers();

  return (
    <div className="space-y-8 p-6 md:p-8">
      <PageHeader title="Usuários" description="Leitura rápida de acesso, vínculo e função na plataforma." />

      <section className="rounded-3xl border border-border bg-white p-5 md:p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Funções</TableHead>
              <TableHead>Salões</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Criado em</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div>
                    <p className="font-medium text-foreground">{user.name}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    {[...new Set(user.memberships.map((membership) => membership.role))].map((role) => (
                      <Badge key={role} variant="outline">
                        {getRoleLabel(role)}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {user.memberships.length
                    ? user.memberships.map((membership) => membership.organization.name).join(" • ")
                    : "Sem vínculo"}
                </TableCell>
                <TableCell>{user.isActive ? <Badge variant="success">Ativo</Badge> : <Badge variant="secondary">Inativo</Badge>}</TableCell>
                <TableCell>{format(user.createdAt, "dd/MM/yyyy", { locale: ptBR })}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
