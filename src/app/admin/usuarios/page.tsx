import { getCurrentMembership } from "@/lib/auth/session";
import { EmptyState } from "@/components/shared/empty-state";

export default async function AdminUsuariosPage() {
  await getCurrentMembership(["ADMIN_GLOBAL"]);
  return <div className="p-8"><EmptyState title="Usuários" description="Gestão global de usuários reservada para expansão futura." /></div>;
}
