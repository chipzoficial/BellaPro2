import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/login-form";
import { AppLogo } from "@/components/brand/app-logo";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#f4dfe5,transparent_35%),linear-gradient(180deg,#fff9f7_0%,#f6f0ef_100%)] px-4 py-10">
      <div className="container flex min-h-[calc(100vh-5rem)] items-center justify-center">
        <div className="grid w-full max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="hidden rounded-[2rem] border border-white/70 bg-white/70 p-10 shadow-soft lg:flex lg:flex-col lg:justify-between">
            <div>
              <AppLogo priority className="w-[280px]" />
              <p className="mt-4 max-w-md text-lg text-muted-foreground">Gestão simples para salões, estúdios e barbearias.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {["Agenda organizada", "Clientes em um só lugar", "Agendamento online", "Mais de uma unidade"].map((item) => (
                <div key={item} className="rounded-2xl bg-white px-4 py-5 text-sm font-medium text-foreground shadow-sm">{item}</div>
              ))}
            </div>
          </section>
          <Card className="border-white/80 bg-white/85">
            <CardContent className="p-8 sm:p-10">
              <div className="mb-8">
                <AppLogo priority className="w-[220px] lg:hidden" />
                <h1 className="mt-4 text-3xl font-semibold">Entrar no sistema</h1>
                <p className="mt-2 text-sm text-muted-foreground">Entre para acessar o painel do seu salão.</p>
              </div>
              <LoginForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
