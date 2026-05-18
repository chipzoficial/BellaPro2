import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { AppLogo } from "@/components/brand/app-logo";

export default async function RedefinirSenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#f4dfe5,transparent_35%),linear-gradient(180deg,#fff9f7_0%,#f6f0ef_100%)] px-4 py-10">
      <div className="container flex min-h-[calc(100vh-5rem)] items-center justify-center">
        <Card className="w-full max-w-xl border-white/80 bg-white/90">
          <CardContent className="p-8 sm:p-10">
            <AppLogo priority className="w-[220px]" />
            <h1 className="mt-6 font-heading text-4xl font-semibold text-brand-800">Redefinir senha</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Escolha uma nova senha para voltar ao painel com segurança.
            </p>

            <div className="mt-8">
              {token ? (
                <ResetPasswordForm token={token} />
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-rose-700">
                    O link de redefinição está incompleto ou inválido.
                  </p>
                  <Link href="/esqueci-minha-senha" className="text-sm font-medium text-primary hover:underline">
                    Solicitar novo link
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
