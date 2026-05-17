import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { RegisterForm } from "@/components/auth/register-form";

export default function CriarContaPage() {
  return (
    <main className="min-h-screen bg-[#fbf6f5] px-4 py-10">
      <div className="container max-w-5xl">
        <div className="mb-8">
          <Link href="/" className="text-sm font-medium text-primary hover:underline">Voltar para o login</Link>
          <h1 className="mt-4 font-heading text-5xl font-semibold text-brand-800">Criar conta</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Cadastre o primeiro usuário owner e o primeiro salão. Após o cadastro você entra direto em `/app`.</p>
        </div>
        <Card>
          <CardContent className="p-8">
            <RegisterForm />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
