import { Card, CardContent } from "@/components/ui/card";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { AppLogo } from "@/components/brand/app-logo";

export default function EsqueciMinhaSenhaPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#f4dfe5,transparent_35%),linear-gradient(180deg,#fff9f7_0%,#f6f0ef_100%)] px-4 py-10">
      <div className="container flex min-h-[calc(100vh-5rem)] items-center justify-center">
        <Card className="w-full max-w-xl border-white/80 bg-white/90">
          <CardContent className="p-8 sm:p-10">
            <AppLogo priority className="w-[220px]" />
            <h1 className="mt-6 font-heading text-4xl font-semibold text-brand-800">Esqueci minha senha</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Informe o e-mail da sua conta para receber um link seguro de redefinição.
            </p>
            <div className="mt-8">
              <ForgotPasswordForm />
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
