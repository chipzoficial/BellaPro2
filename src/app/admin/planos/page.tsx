import { getCurrentMembership } from "@/lib/auth/session";
import { EmptyState } from "@/components/shared/empty-state";

export default async function AdminPlanosPage() {
  await getCurrentMembership(["ADMIN_GLOBAL"]);
  return <div className="p-8"><EmptyState title="Planos" description="Estrutura de planos SaaS preparada para evolução posterior." /></div>;
}
