"use client";

import { SubscriptionStatus } from "@prisma/client";
import { useMemo, useState } from "react";
import { Check, CreditCard, ExternalLink, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatMoney } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";

type Overview = {
  organization: {
    id: string;
    name: string;
    email: string | null;
    stripeCustomerId: string | null;
  };
  plans: Array<{
    id: string;
    name: string;
    description: string | null;
    priceInCents: number;
    maxProfessionals: number | null;
    maxAppointmentsPerMonth: number | null;
    stripeProductId: string | null;
    stripePriceId: string | null;
    isActive: boolean;
  }>;
  currentSubscription: {
    id: string;
    status: SubscriptionStatus;
    cancelAtPeriodEnd: boolean;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    plan: {
      id: string;
      name: string;
      description: string | null;
      priceInCents: number;
    };
  } | null;
};

const statusLabelMap: Record<SubscriptionStatus, string> = {
  TRIALING: "Período de teste",
  ACTIVE: "Ativa",
  PAST_DUE: "Pagamento pendente",
  CANCELED: "Cancelada",
  EXPIRED: "Expirada",
};

const statusVariantMap: Record<SubscriptionStatus, "default" | "warning" | "danger" | "success"> = {
  TRIALING: "default",
  ACTIVE: "success",
  PAST_DUE: "warning",
  CANCELED: "danger",
  EXPIRED: "danger",
};

export function AssinaturaPage({ overview }: { overview: Overview }) {
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);

  const currentPlanId = overview.currentSubscription?.plan.id ?? null;
  const canOpenPortal = Boolean(overview.organization.stripeCustomerId);
  const nextBillingText = useMemo(() => {
    if (!overview.currentSubscription) return "Ainda não existe assinatura ativa.";
    if (overview.currentSubscription.cancelAtPeriodEnd) {
      return `Encerramento programado para ${formatDateTime(overview.currentSubscription.currentPeriodEnd, "dd/MM/yyyy")}.`;
    }
    return `Vigência atual até ${formatDateTime(overview.currentSubscription.currentPeriodEnd, "dd/MM/yyyy")}.`;
  }, [overview.currentSubscription]);

  async function startCheckout(planId: string) {
    setLoadingPlanId(planId);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ planId }),
      });

      const payload = (await response.json()) as { success: boolean; message?: string; url?: string };

      if (!response.ok || !payload.success || !payload.url) {
        toast.error(payload.message || "Não foi possível abrir o checkout.");
        return;
      }

      window.location.href = payload.url;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao iniciar checkout.");
    } finally {
      setLoadingPlanId(null);
    }
  }

  async function openPortal() {
    setIsOpeningPortal(true);
    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
      });

      const payload = (await response.json()) as { success: boolean; message?: string; url?: string };

      if (!response.ok || !payload.success || !payload.url) {
        toast.error(payload.message || "Não foi possível abrir o portal da cobrança.");
        return;
      }

      window.location.href = payload.url;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao abrir portal da cobrança.");
    } finally {
      setIsOpeningPortal(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_360px]">
        <div className="rounded-[28px] border border-border bg-white p-6 shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Badge variant={overview.currentSubscription ? statusVariantMap[overview.currentSubscription.status] : "outline"}>
                {overview.currentSubscription ? statusLabelMap[overview.currentSubscription.status] : "Sem assinatura ativa"}
              </Badge>
              <h2 className="mt-4 font-heading text-3xl text-foreground">
                {overview.currentSubscription ? overview.currentSubscription.plan.name : "Escolha um plano para cobrar seus salões"}
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                {overview.currentSubscription
                  ? `Plano atual da organização ${overview.organization.name}. ${nextBillingText}`
                  : "Ative a cobrança recorrente via Stripe Checkout. O BellaPro sincroniza o status da assinatura por webhook."}
              </p>
            </div>
            {overview.currentSubscription ? (
              <div className="rounded-2xl border border-border bg-[#fffaf9] px-4 py-3 text-right">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Valor recorrente</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {formatMoney(overview.currentSubscription.plan.priceInCents)}
                </p>
                <p className="text-xs text-muted-foreground">cobrança mensal</p>
              </div>
            ) : null}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <SummaryTile
              icon={CreditCard}
              label="Status"
              value={overview.currentSubscription ? statusLabelMap[overview.currentSubscription.status] : "Sem assinatura"}
              helper={nextBillingText}
            />
            <SummaryTile
              icon={ShieldCheck}
              label="Cliente Stripe"
              value={overview.organization.stripeCustomerId ? "Conectado" : "Ainda não criado"}
              helper={overview.organization.email || "Sem e-mail comercial definido"}
            />
            <SummaryTile
              icon={Sparkles}
              label="Portal da cobrança"
              value={canOpenPortal ? "Disponível" : "Liberado após o primeiro checkout"}
              helper="Cartão, faturas e cancelamento ficam por conta da Stripe."
            />
          </div>
        </div>

        <aside className="rounded-[28px] border border-border bg-white p-6 shadow-soft">
          <h3 className="text-lg font-semibold text-foreground">Ações de cobrança</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Use o checkout para novas assinaturas e o portal da Stripe para gerenciar cartão, faturas e cancelamento.
          </p>

          <div className="mt-6 space-y-3">
            <Button type="button" className="w-full justify-between" onClick={() => currentPlanId && startCheckout(currentPlanId)} disabled={!currentPlanId || Boolean(overview.currentSubscription?.status === SubscriptionStatus.ACTIVE)}>
              <span>Assinar plano atual</span>
              {loadingPlanId === currentPlanId ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
            </Button>
            <Button type="button" variant="outline" className="w-full justify-between" onClick={openPortal} disabled={!canOpenPortal || isOpeningPortal}>
              <span>Abrir portal da cobrança</span>
              {isOpeningPortal ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
            </Button>
          </div>

          <div className="mt-6 rounded-2xl border border-dashed border-border px-4 py-4 text-sm text-muted-foreground">
            Se o plano local ainda não tiver um <code>stripePriceId</code> configurado, o checkout será bloqueado até a vinculação com a Stripe.
          </div>
        </aside>
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Planos disponíveis</h3>
          <p className="mt-1 text-sm text-muted-foreground">Cada plano local precisa estar vinculado a um Price da Stripe para liberar o checkout.</p>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          {overview.plans.map((plan) => {
            const isCurrent = plan.id === currentPlanId;
            const isLoading = loadingPlanId === plan.id;

            return (
              <div key={plan.id} className={`rounded-[26px] border p-6 shadow-soft ${isCurrent ? "border-brand-300 bg-brand-50/40" : "border-border bg-white"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-foreground">{plan.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{plan.description || "Plano sem descrição definida."}</p>
                  </div>
                  {isCurrent ? <Badge variant="success">Plano atual</Badge> : null}
                </div>

                <div className="mt-6">
                  <p className="text-3xl font-semibold text-foreground">{formatMoney(plan.priceInCents)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">por mês</p>
                </div>

                <div className="mt-6 space-y-3 text-sm text-muted-foreground">
                  <FeatureRow label={plan.maxProfessionals ? `Até ${plan.maxProfessionals} profissionais` : "Profissionais ilimitados"} />
                  <FeatureRow
                    label={
                      plan.maxAppointmentsPerMonth
                        ? `Até ${plan.maxAppointmentsPerMonth} agendamentos por mês`
                        : "Agendamentos ilimitados"
                    }
                  />
                  <FeatureRow
                    label={plan.stripePriceId ? "Price Stripe vinculado" : "Plano ainda sem vínculo com a Stripe"}
                    danger={!plan.stripePriceId}
                  />
                </div>

                <div className="mt-6">
                  <Button
                    type="button"
                    className="w-full"
                    variant={isCurrent ? "outline" : "default"}
                    disabled={isCurrent || !plan.stripePriceId || isLoading}
                    onClick={() => startCheckout(plan.id)}
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {isCurrent ? "Plano atual" : "Assinar com Stripe"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function SummaryTile({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: typeof CreditCard;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-[#fffaf9] px-4 py-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4 text-brand-700" />
        <span className="text-xs font-medium uppercase tracking-[0.16em]">{label}</span>
      </div>
      <p className="mt-3 text-lg font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
    </div>
  );
}

function FeatureRow({ label, danger = false }: { label: string; danger?: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${danger ? "text-rose-700" : ""}`}>
      <Check className="h-4 w-4 shrink-0" />
      <span>{label}</span>
    </div>
  );
}
