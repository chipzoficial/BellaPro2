import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export default function PublicNotFound() {
  return (
    <main className="min-h-screen bg-[#fbf6f5] px-4 py-10">
      <div className="container max-w-3xl">
        <EmptyState
          title="Salão não encontrado"
          description="O slug informado não corresponde a nenhum salão ativo da plataforma BellaPro."
          action={
            <Button asChild>
              <Link href="/">Voltar para o login</Link>
            </Button>
          }
        />
      </div>
    </main>
  );
}
