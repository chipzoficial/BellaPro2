"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { registerAction } from "@/server/actions/auth";
import { brazilStates, onboardingServiceCatalog } from "@/lib/onboarding";
import { normalizeSlug } from "@/lib/slug";
import { registerSchema, type RegisterInput } from "@/lib/validations/auth";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { cn, formatMoney } from "@/lib/utils";

const onboardingSteps = [
  {
    id: "conta",
    title: "Conta",
    description: "Seus dados de acesso.",
  },
  {
    id: "salao",
    title: "Salão",
    description: "Informações principais do salão.",
  },
  {
    id: "servicos",
    title: "Serviços",
    description: "Escolha os serviços que já deseja cadastrar.",
  },
  {
    id: "profissionais",
    title: "Profissionais",
    description: "Cadastre a equipe inicial e vincule os serviços de cada pessoa.",
  },
  {
    id: "revisao",
    title: "Revisão",
    description: "Revise os dados antes de criar a conta.",
  },
] as const;

function createEmptyProfessional(): RegisterInput["professionals"][number] {
  return {
    name: "",
    phone: "",
    email: "",
    serviceKeys: [],
  };
}

export function RegisterForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState(0);
  const [slugLocked, setSlugLocked] = useState(false);
  const [reviewConfirmed, setReviewConfirmed] = useState(false);

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      salonName: "",
      slug: "",
      salonPhone: "",
      city: "",
      state: "",
      address: "",
      teamSize: 1,
      serviceKeys: [],
      professionals: [createEmptyProfessional()],
    },
  });

  const { fields, replace } = useFieldArray({
    control: form.control,
    name: "professionals",
  });

  const salonName = useWatch({ control: form.control, name: "salonName" });
  const slug = useWatch({ control: form.control, name: "slug" });
  const teamSize = useWatch({ control: form.control, name: "teamSize" }) || 1;
  const selectedServiceKeys = useWatch({ control: form.control, name: "serviceKeys" }) || [];
  const professionals = useWatch({ control: form.control, name: "professionals" }) || [];

  useEffect(() => {
    if (slugLocked) return;
    form.setValue("slug", normalizeSlug(salonName || ""), { shouldValidate: step > 0 });
  }, [form, salonName, slugLocked, step]);

  useEffect(() => {
    const current = form.getValues("professionals");
    const normalizedTeamSize = Math.max(1, Math.min(Number(teamSize) || 1, 20));

    if (current.length === normalizedTeamSize) return;

    const next = Array.from({ length: normalizedTeamSize }, (_, index) => current[index] ?? createEmptyProfessional());
    replace(next);
  }, [form, replace, teamSize]);

  useEffect(() => {
    const current = form.getValues("professionals");
    const next = current.map((professional) => ({
      ...professional,
      serviceKeys: professional.serviceKeys.filter((serviceKey) => selectedServiceKeys.includes(serviceKey)),
    }));

    if (JSON.stringify(current) === JSON.stringify(next)) return;

    replace(next);
  }, [form, replace, selectedServiceKeys]);

  const selectedServices = useMemo(
    () => onboardingServiceCatalog.filter((service) => selectedServiceKeys.includes(service.key)),
    [selectedServiceKeys]
  );

  useEffect(() => {
    if (step !== onboardingSteps.length - 1) {
      setReviewConfirmed(false);
    }
  }, [step]);

  async function goToNextStep() {
    const valid = await validateCurrentStep();
    if (!valid) {
      toast.error("Revise os campos obrigatórios antes de continuar.");
      return;
    }
    setStep((current) => Math.min(current + 1, onboardingSteps.length - 1));
  }

  function goToPreviousStep() {
    setStep((current) => Math.max(current - 1, 0));
  }

  async function validateCurrentStep() {
    switch (step) {
      case 0:
        return form.trigger(["name", "email", "phone", "password", "confirmPassword"]);
      case 1:
        return form.trigger(["salonName", "slug", "salonPhone", "city", "state", "address", "teamSize"]);
      case 2:
        return form.trigger(["serviceKeys"]);
      case 3:
        return form.trigger(["teamSize", "professionals"]);
      default:
        return form.trigger();
    }
  }

  function onSubmit(values: RegisterInput) {
    startTransition(async () => {
      const result = await registerAction(values);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      router.push(result.message);
      router.refresh();
    });
  }

  async function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (step < onboardingSteps.length - 1) {
      await goToNextStep();
      return;
    }

    if (!reviewConfirmed) {
      toast.error("Revise os dados e confirme a revisão antes de criar a conta.");
      return;
    }

    void form.handleSubmit(onSubmit)(event);
  }

  return (
    <Form {...form}>
      <form onSubmit={handleFormSubmit} className="space-y-8">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 rounded-[22px] border border-border bg-white px-4 py-4 md:hidden">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Etapa {step + 1} de {onboardingSteps.length}
              </p>
              <p className="mt-2 text-lg font-semibold text-foreground">{onboardingSteps[step].title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{onboardingSteps[step].description}</p>
            </div>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-700 text-sm font-semibold text-white">
              {step + 1}
            </span>
          </div>

          <div className="grid grid-cols-5 gap-2 md:hidden">
            {onboardingSteps.map((item, index) => {
              const isCurrent = index === step;
              const isDone = index < step;

              return (
                <div
                  key={`${item.id}-mobile`}
                  className={cn(
                    "h-1.5 rounded-full transition-colors",
                    isCurrent && "bg-brand-700",
                    isDone && "bg-emerald-600",
                    !isCurrent && !isDone && "bg-border"
                  )}
                />
              );
            })}
          </div>

          <div className="hidden gap-3 md:grid md:grid-cols-2 xl:grid-cols-5">
          {onboardingSteps.map((item, index) => {
            const isCurrent = index === step;
            const isDone = index < step;

            return (
              <div
                key={item.id}
                className={cn(
                  "flex min-h-[176px] flex-col rounded-[24px] border px-4 py-4 transition-colors",
                  isCurrent && "border-brand-300 bg-white",
                  isDone && "border-emerald-200 bg-emerald-50/70",
                  !isCurrent && !isDone && "border-border bg-[#fffaf9]"
                )}
              >
                <div className="flex h-full flex-col gap-4">
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold",
                      isDone && "bg-emerald-600 text-white",
                      isCurrent && "bg-brand-700 text-white",
                      !isCurrent && !isDone && "bg-muted text-muted-foreground"
                    )}
                  >
                    {isDone ? <Check className="h-4 w-4" /> : index + 1}
                  </span>
                  <div>
                    <p className="text-base font-medium text-foreground">{item.title}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        </div>

        <div className="rounded-[30px] border border-border bg-white px-6 py-7 md:px-7">
          {step === 0 ? <AccountStep form={form} /> : null}
          {step === 1 ? (
            <SalonStep form={form} slug={slug} onSlugManualEdit={() => setSlugLocked(true)} />
          ) : null}
          {step === 2 ? <ServicesStep form={form} selectedServiceKeys={selectedServiceKeys} /> : null}
          {step === 3 ? (
            <ProfessionalsStep
              form={form}
              fields={fields}
              selectedServices={selectedServices}
              professionals={professionals}
            />
          ) : null}
          {step === 4 ? (
            <ReviewStep
              values={form.getValues()}
              selectedServices={selectedServices}
              reviewConfirmed={reviewConfirmed}
              onReviewConfirmedChange={setReviewConfirmed}
            />
          ) : null}
        </div>

        <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Etapa {step + 1} de {onboardingSteps.length}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            {step > 0 ? (
              <Button type="button" variant="outline" onClick={goToPreviousStep}>
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
            ) : null}
            {step < onboardingSteps.length - 1 ? (
              <Button type="button" onClick={goToNextStep}>
                Continuar
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" disabled={isPending || !reviewConfirmed}>
                <Sparkles className="h-4 w-4" />
                {isPending ? "Criando sua conta..." : "Criar conta"}
              </Button>
            )}
          </div>
        </div>
      </form>
    </Form>
  );
}

function AccountStep({ form }: { form: ReturnType<typeof useForm<RegisterInput>> }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-4xl font-semibold text-brand-800">Passo 1: Sua conta</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Informe os dados da conta principal do salão.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <FormField control={form.control} name="name" render={({ field }) => <FormItem><FormLabel>Nome completo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
        <FormField control={form.control} name="email" render={({ field }) => <FormItem><FormLabel>E-mail</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
        <FormField control={form.control} name="phone" render={({ field }) => <FormItem><FormLabel>Telefone</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>} />
        <FormField control={form.control} name="password" render={({ field }) => <FormItem><FormLabel>Senha</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>} />
        <FormField control={form.control} name="confirmPassword" render={({ field }) => <FormItem className="md:col-span-2"><FormLabel>Confirmar senha</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>} />
      </div>
    </div>
  );
}

function SalonStep({
  form,
  slug,
  onSlugManualEdit,
}: {
  form: ReturnType<typeof useForm<RegisterInput>>;
  slug: string;
  onSlugManualEdit: () => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-4xl font-semibold text-brand-800">Passo 2: Seu salão</h2>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Defina a identidade básica do salão e quantas pessoas deseja cadastrar agora.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <FormField control={form.control} name="salonName" render={({ field }) => <FormItem><FormLabel>Nome do salão</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Endereço da página</FormLabel>
              <FormControl>
                <Input
                  placeholder="salao-da-leh"
                  {...field}
                  value={field.value ?? ""}
                  onChange={(event) => {
                    onSlugManualEdit();
                    field.onChange(normalizeSlug(event.target.value));
                  }}
                />
              </FormControl>
              <p className="text-xs text-muted-foreground">Sua página ficará em /{slug || "seu-link"}</p>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField control={form.control} name="salonPhone" render={({ field }) => <FormItem><FormLabel>Contato do salão</FormLabel><FormControl><Input {...field} value={field.value ?? ""} placeholder="(11) 99999-9999" /></FormControl><FormMessage /></FormItem>} />
        <FormField
          control={form.control}
          name="teamSize"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quantos profissionais deseja cadastrar agora?</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  {...field}
                  value={field.value ?? 1}
                  onChange={(event) => field.onChange(Number(event.target.value || 1))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField control={form.control} name="city" render={({ field }) => <FormItem><FormLabel>Cidade</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
        <FormField
          control={form.control}
          name="state"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Estado</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o estado" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {brazilStates.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField control={form.control} name="address" render={({ field }) => <FormItem className="md:col-span-2"><FormLabel>Endereço do salão</FormLabel><FormControl><Input {...field} value={field.value ?? ""} placeholder="Rua, número e complemento" /></FormControl><FormMessage /></FormItem>} />
      </div>
    </div>
  );
}

function ServicesStep({
  form,
  selectedServiceKeys,
}: {
  form: ReturnType<typeof useForm<RegisterInput>>;
  selectedServiceKeys: string[];
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-4xl font-semibold text-brand-800">Passo 3: Serviços iniciais</h2>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Marque os atendimentos que o salão já oferece. Eles entrarão prontos no cadastro e poderão ser ajustados depois.
        </p>
      </div>

      <FormField
        control={form.control}
        name="serviceKeys"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Quais atividades o salão exerce?</FormLabel>
            <FormControl>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {onboardingServiceCatalog.map((service) => {
                  const selected = selectedServiceKeys.includes(service.key);

                  return (
                    <button
                      key={service.key}
                      type="button"
                      onClick={() => {
                        const nextValue = selected
                          ? (field.value ?? []).filter((item) => item !== service.key)
                          : [...(field.value ?? []), service.key];
                        field.onChange(nextValue);
                      }}
                      className={cn(
                        "rounded-[22px] border px-4 py-4 text-left transition-colors",
                        selected ? "border-brand-300 bg-brand-50/70" : "border-border bg-[#fffaf9] hover:bg-white"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-foreground">{service.name}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{service.description}</p>
                        </div>
                        <span className={cn("rounded-full px-2 py-1 text-xs font-medium", selected ? "bg-brand-700 text-white" : "bg-muted text-muted-foreground")}>
                          {selected ? "Selecionado" : "Adicionar"}
                        </span>
                      </div>
                      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                        <span>{service.durationMinutes} min</span>
                        <span>{formatMoney(service.priceInCents)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

function ProfessionalsStep({
  form,
  fields,
  selectedServices,
  professionals,
}: {
  form: ReturnType<typeof useForm<RegisterInput>>;
  fields: Array<{ id: string }>;
  selectedServices: Array<(typeof onboardingServiceCatalog)[number]>;
  professionals: RegisterInput["professionals"];
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-4xl font-semibold text-brand-800">Passo 4: Profissionais</h2>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Cadastre a equipe inicial e vincule os serviços de cada pessoa.
        </p>
      </div>

      <FormField control={form.control} name="teamSize" render={() => <FormMessage />} />

      <div className="space-y-4">
        {fields.map((item, index) => {
          const selectedByProfessional = professionals?.[index]?.serviceKeys ?? [];

          return (
            <div
              key={item.id}
              className={cn(
                "space-y-5",
                index > 0 && "border-t border-border pt-6"
              )}
            >
              <div>
                <p className="text-sm font-medium text-muted-foreground">Profissional {index + 1}</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField control={form.control} name={`professionals.${index}.name`} render={({ field }) => <FormItem><FormLabel>Nome</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name={`professionals.${index}.phone`} render={({ field }) => <FormItem><FormLabel>Telefone</FormLabel><FormControl><Input {...field} value={field.value ?? ""} placeholder="(11) 99999-9999" /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name={`professionals.${index}.email`} render={({ field }) => <FormItem className="md:col-span-2"><FormLabel>E-mail</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>} />
              </div>

              <FormField
                control={form.control}
                name={`professionals.${index}.serviceKeys`}
                render={({ field }) => (
                  <FormItem className="mt-5">
                    <FormLabel>Quais serviços essa pessoa executa?</FormLabel>
                    <FormControl>
                      <div className="flex flex-wrap gap-2">
                        {selectedServices.map((service) => {
                          const selected = selectedByProfessional.includes(service.key);

                          return (
                            <button
                              key={service.key}
                              type="button"
                              onClick={() => {
                                const nextValue = selected
                                  ? (field.value ?? []).filter((itemKey) => itemKey !== service.key)
                                  : [...(field.value ?? []), service.key];
                                field.onChange(nextValue);
                              }}
                              className={cn(
                                "rounded-full border px-3 py-2 text-sm transition-colors",
                                selected ? "border-brand-300 bg-brand-50 text-brand-800" : "border-border bg-white text-muted-foreground"
                              )}
                            >
                              {service.name}
                            </button>
                          );
                        })}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReviewStep({
  values,
  selectedServices,
  reviewConfirmed,
  onReviewConfirmedChange,
}: {
  values: RegisterInput;
  selectedServices: Array<(typeof onboardingServiceCatalog)[number]>;
  reviewConfirmed: boolean;
  onReviewConfirmedChange: (value: boolean) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-4xl font-semibold text-brand-800">Passo 5: Revisar e concluir</h2>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Revise as informações antes de concluir o cadastro.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <ReviewCard
          title="Conta"
          rows={[
            ["Nome", values.name],
            ["E-mail", values.email],
            ["Telefone", values.phone || "—"],
          ]}
        />
        <ReviewCard
          title="Salão"
          rows={[
            ["Nome", values.salonName],
            ["Slug", values.slug],
            ["Contato", values.salonPhone || "—"],
            ["Cidade", `${values.city} - ${values.state}`],
          ]}
        />
      </div>

      <ReviewCard
        title="Serviços iniciais"
        rows={selectedServices.map((service) => [service.name, `${service.durationMinutes} min · ${formatMoney(service.priceInCents)}`])}
      />

      <div className="space-y-4">
        <p className="text-sm font-medium text-foreground">Equipe inicial</p>
        <div className="grid gap-4 xl:grid-cols-2">
          {values.professionals.map((professional, index) => (
            <div key={`${professional.name}-${index}`} className="rounded-[22px] border border-border bg-[#fffaf9] px-4 py-4">
              <p className="font-medium text-foreground">{professional.name || `Profissional ${index + 1}`}</p>
              <p className="mt-1 text-sm text-muted-foreground">{professional.phone || "Sem telefone informado"}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {professional.serviceKeys.map((serviceKey) => {
                  const service = onboardingServiceCatalog.find((item) => item.key === serviceKey);
                  if (!service) return null;
                  return (
                    <span key={serviceKey} className="rounded-full bg-white px-3 py-1 text-xs text-muted-foreground">
                      {service.name}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onReviewConfirmedChange(!reviewConfirmed)}
        className={cn(
          "flex w-full items-start gap-3 rounded-[22px] border px-4 py-4 text-left transition-colors",
          reviewConfirmed ? "border-brand-300 bg-brand-50/70" : "border-border bg-[#fffaf9]"
        )}
      >
        <span
          className={cn(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs",
            reviewConfirmed
              ? "border-brand-700 bg-brand-700 text-white"
              : "border-border bg-white text-transparent"
          )}
        >
          <Check className="h-3.5 w-3.5" />
        </span>
        <div>
          <p className="text-sm font-medium text-foreground">Confirmo os dados para criar a conta</p>
          <p className="mt-1 text-sm text-muted-foreground">
            O teste grátis de 14 dias começa assim que a conta for criada.
          </p>
        </div>
      </button>
    </div>
  );
}

function ReviewCard({
  title,
  rows,
}: {
  title: string;
  rows: Array<[string, string]>;
}) {
  return (
    <div className="rounded-[24px] border border-border bg-[#fffaf9] px-5 py-5">
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <div className="mt-4 space-y-3">
        {rows.map(([label, value]) => (
          <div key={`${title}-${label}`} className="flex flex-col gap-1 border-b border-border pb-3 last:border-b-0 last:pb-0 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-sm font-medium text-foreground">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
