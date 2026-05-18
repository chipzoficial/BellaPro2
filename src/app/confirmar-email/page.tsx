import Link from "next/link";
import { confirmEmailAction } from "@/server/actions/auth";
import { AppLogo } from "@/components/brand/app-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function ConfirmarEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const result = token
    ? await confirmEmailAction(token)
    : {
        success: false,
        message: "O link de confirmação está incompleto ou inválido.",
      };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#f4dfe5,transparent_35%),linear-gradient(180deg,#fff9f7_0%,#f6f0ef_100%)] px-4 py-10">
      <div className="container flex min-h-[calc(100vh-5rem)] items-center justify-center">
        <Card className="w-full max-w-xl border-white/80 bg-white/90">
          <CardContent className="p-8 sm:p-10">
            <AppLogo priority className="w-[220px]" />
            <h1 className="mt-6 font-heading text-4xl font-semibold text-brand-800">
              {result.success ? "E-mail confirmado" : "Não foi possível confirmar"}
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">{result.message}</p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/">Ir para o login</Link>
              </Button>
              {!result.success ? (
                <Button asChild variant="outline" size="lg">
                  <Link href="/esqueci-minha-senha">Preciso de ajuda com o acesso</Link>
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
