import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#f4dfe5,transparent_35%),linear-gradient(180deg,#fff9f7_0%,#f6f0ef_100%)] px-4 py-10">
      <div className="container flex min-h-[calc(100vh-5rem)] items-center justify-center">
        <div className="grid w-full max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="hidden rounded-[2rem] border border-white/70 bg-white/70 p-10 shadow-soft lg:flex lg:flex-col lg:justify-between">
            <div>
              <p className="font-heading text-6xl font-semibold text-brand-800">BellaPro</p>
              <p className="mt-4 max-w-md text-lg text-muted-foreground">Gestão e agendamento para salões de beleza, esmalterias, barbearias e clínicas de estética.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {["Agenda profissional", "Clientes centralizados", "Fluxo público por slug", "Operação multiempresa"].map((item) => (
                <div key={item} className="rounded-2xl bg-white px-4 py-5 text-sm font-medium text-foreground shadow-sm">{item}</div>
              ))}
            </div>
          </section>
          <Card className="border-white/80 bg-white/85">
            <CardContent className="p-8 sm:p-10">
              <div className="mb-8">
                <p className="font-heading text-5xl font-semibold text-brand-800 lg:hidden">BellaPro</p>
                <h1 className="mt-4 text-3xl font-semibold">Entrar no sistema</h1>
                <p className="mt-2 text-sm text-muted-foreground">Acesse o painel do seu salão. A raiz do domínio é o login do BellaPro.</p>
              </div>
              <LoginForm />
              <p className="mt-8 text-sm text-muted-foreground">
                Novo por aqui? <Link href="/criar-conta" className="font-medium text-primary hover:underline">Crie sua conta</Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
