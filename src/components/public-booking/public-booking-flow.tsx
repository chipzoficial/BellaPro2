"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import type { FieldErrors } from "react-hook-form";
import { useForm } from "react-hook-form";
import { CalendarDays, ChevronLeft, ChevronRight, CircleCheckBig, Scissors } from "lucide-react";
import { publicBookingSchema } from "@/lib/validations/entities";
import { createPublicBooking, getPublicAvailability } from "@/server/actions/domain";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { Separator } from "@/components/ui/separator";
import { formatDateTime } from "@/lib/utils";

type Props = {
  slug: string;
  services: Array<{ id: string; name: string }>;
  professionals: Array<{ id: string; name: string; serviceIds: string[] }>;
  slots: Array<{ time: string; professionalId: string; professionalName: string }>;
};

const steps = [
  { number: 1, title: "Serviço e profissional", description: "Escolha o atendimento e quem vai executá-lo." },
  { number: 2, title: "Dia e horário", description: "Selecione a data desejada e um horário disponível." },
  { number: 3, title: "Seus dados", description: "Informe os dados do cliente para o salão confirmar o atendimento." },
  { number: 4, title: "Revisar e aceitar", description: "Confira tudo antes de solicitar o agendamento." },
] as const;

export function PublicBookingFlow({ slug, services, professionals, slots }: Props) {
  const [step, setStep] = useState<(typeof steps)[number]["number"]>(1);
  const [acceptedReview, setAcceptedReview] = useState(false);
  const [isLoadingSlots, startLoadingSlots] = useTransition();
  const [isSubmitting, startSubmitting] = useTransition();
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>("");
  const [availableSlots, setAvailableSlots] = useState(slots);
  const lastAvailabilityKeyRef = useRef("");
  const dateInputRef = useRef<HTMLInputElement | null>(null);
  const form = useForm({
    resolver: zodResolver(publicBookingSchema),
    defaultValues: {
      organizationSlug: slug,
      serviceId: services[0]?.id ?? "",
      professionalId: "",
      date: new Date().toISOString().slice(0, 10),
      time: "",
      name: "",
      phone: "",
      email: "",
      notes: "",
    },
  });

  const watchedServiceId = form.watch("serviceId");
  const watchedProfessionalId = form.watch("professionalId");
  const watchedDate = form.watch("date");
  const watchedTime = form.watch("time");
  const availableProfessionals = useMemo(
    () => professionals.filter((professional) => professional.serviceIds.includes(watchedServiceId)),
    [professionals, watchedServiceId]
  );
  const selectedService = useMemo(
    () => services.find((service) => service.id === watchedServiceId) ?? null,
    [services, watchedServiceId]
  );
  const selectedProfessional = useMemo(
    () => professionals.find((professional) => professional.id === watchedProfessionalId) ?? null,
    [professionals, watchedProfessionalId]
  );
  const selectedSlot = useMemo(
    () =>
      availableSlots.find(
        (slot) =>
          slot.time === watchedTime &&
          (!watchedProfessionalId || slot.professionalId === watchedProfessionalId)
      ) ?? null,
    [availableSlots, watchedProfessionalId, watchedTime]
  );

  useEffect(() => {
    if (!watchedProfessionalId) return;
    if (availableProfessionals.some((professional) => professional.id === watchedProfessionalId)) return;

    form.setValue("professionalId", "");
    setSelectedProfessionalId("");
  }, [availableProfessionals, form, watchedProfessionalId]);

  useEffect(() => {
    if (!watchedServiceId || !watchedDate) return;

    const availabilityKey = [slug, watchedServiceId, selectedProfessionalId || "any", watchedDate].join(":");
    if (lastAvailabilityKeyRef.current === availabilityKey) return;
    lastAvailabilityKeyRef.current = availabilityKey;

    startLoadingSlots(async () => {
      const nextSlots = await getPublicAvailability({
        organizationSlug: slug,
        serviceId: watchedServiceId,
        professionalId: selectedProfessionalId || undefined,
        date: watchedDate,
      });
      const currentTime = form.getValues("time");
      const currentSelectedProfessionalId = form.getValues("professionalId");
      setAvailableSlots(nextSlots);

      const stillAvailable = nextSlots.some(
        (slot) =>
          slot.time === currentTime &&
          (!currentSelectedProfessionalId || slot.professionalId === currentSelectedProfessionalId)
      );

      if (!stillAvailable) {
        form.setValue("time", "");
      }
    });
  }, [form, selectedProfessionalId, slug, watchedDate, watchedServiceId]);

  async function goToNextStep() {
    if (step === 1) {
      const valid = await form.trigger(["serviceId"]);
      if (!valid) return toast.error("Escolha o serviço antes de avançar.");
      if (!availableProfessionals.length) {
        toast.error("Este serviço não possui profissionais disponíveis no momento.");
        return;
      }
      setStep(2);
      return;
    }

    if (step === 2) {
      const valid = await form.trigger(["date", "time"]);
      if (!valid) return toast.error("Selecione um dia e um horário disponível.");
      setStep(3);
      return;
    }

    if (step === 3) {
      const valid = await form.trigger(["name", "phone", "email", "notes"]);
      if (!valid) return toast.error("Revise seus dados antes de continuar.");
      setStep(4);
    }
  }

  function onSubmit(values: any) {
    if (!acceptedReview) {
      toast.error("Confirme a revisão dos dados antes de solicitar o agendamento.");
      return;
    }

    startSubmitting(async () => {
      const result = await createPublicBooking(values);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Agendamento solicitado com sucesso.");
      form.reset({
        organizationSlug: slug,
        serviceId: services[0]?.id ?? "",
        professionalId: "",
        date: new Date().toISOString().slice(0, 10),
        time: "",
        name: "",
        phone: "",
        email: "",
        notes: "",
      });
      setSelectedProfessionalId("");
      setAcceptedReview(false);
      setStep(1);
    });
  }

  function onInvalid(errors: FieldErrors<any>) {
    const firstMessage = Object.values(errors)
      .map((error) => error?.message)
      .find((message) => typeof message === "string");

    toast.error(firstMessage || "Revise os campos obrigatórios antes de confirmar.");
  }

  function openDatePicker() {
    const input = dateInputRef.current;
    if (!input) return;

    input.focus();
    if ("showPicker" in input) {
      input.showPicker();
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-6">
        <div className="grid gap-3 md:grid-cols-4">
          {steps.map((item) => {
            const isActive = step === item.number;
            const isDone = step > item.number;

            return (
              <div
                key={item.number}
                className={`rounded-2xl border px-4 py-4 ${
                  isActive ? "border-brand-300 bg-brand-50/80" : isDone ? "border-emerald-200 bg-emerald-50/70" : "border-border bg-white"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                      isActive
                        ? "bg-brand-600 text-white"
                        : isDone
                          ? "bg-emerald-600 text-white"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isDone ? <CircleCheckBig className="h-4 w-4" /> : item.number}
                  </span>
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{item.description}</p>
              </div>
            );
          })}
        </div>

        <section className="min-h-[360px] rounded-[28px] border border-border bg-white px-6 py-6 md:px-8">
          {step === 1 ? (
            <div className="space-y-6">
              <StepHeader
                title="Passo 1: Selecionar serviço e profissional"
                description="Comece escolhendo qual atendimento deseja e quem vai realizá-lo."
              />

              <div className="grid gap-5 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="serviceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Serviço</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um serviço" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {services.map((service) => (
                            <SelectItem key={service.id} value={service.id}>
                              {service.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="professionalId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Profissional</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value === "any" ? "" : value);
                          setSelectedProfessionalId(value === "any" ? "" : value);
                        }}
                        value={field.value || "any"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Qualquer profissional disponível" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="any">Qualquer profissional disponível</SelectItem>
                          {availableProfessionals.map((professional) => (
                            <SelectItem key={professional.id} value={professional.id}>
                              {professional.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {!availableProfessionals.length ? (
                        <p className="text-sm text-muted-foreground">
                          Nenhuma profissional ativa realiza este serviço no momento.
                        </p>
                      ) : null}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <SummaryStrip
                icon={<Scissors className="h-4 w-4 text-brand-700" />}
                title={selectedService?.name ?? "Selecione um serviço"}
                description={selectedProfessional?.name ?? "Qualquer profissional disponível"}
              />
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-6">
              <StepHeader
                title="Passo 2: Selecionar dia e horário"
                description="Escolha a data e depois toque em um horário disponível para continuar."
              />

              <div className="grid gap-5 md:grid-cols-[220px_1fr]">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          ref={(node) => {
                            dateInputRef.current = node;
                            field.ref(node);
                          }}
                          onClick={openDatePicker}
                          onFocus={openDatePicker}
                          className="cursor-pointer"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Horários disponíveis</FormLabel>
                      <div className="flex min-h-[120px] flex-wrap content-start items-start gap-2 md:min-h-[56px]">
                        {availableSlots.length ? (
                          availableSlots.map((slot) => (
                            <button
                              key={`${slot.professionalId}-${slot.time}`}
                              type="button"
                              onClick={() => {
                                field.onChange(slot.time);
                                form.setValue("professionalId", slot.professionalId);
                                setSelectedProfessionalId(slot.professionalId);
                              }}
                              className={`rounded-full border px-3 py-2 text-sm transition-colors ${
                                field.value === slot.time
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border bg-background hover:bg-muted"
                              }`}
                            >
                              {slot.time}
                            </button>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            {isLoadingSlots ? "Carregando horários..." : "Nenhum horário disponível para os filtros atuais."}
                          </p>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <SummaryStrip
                icon={<CalendarDays className="h-4 w-4 text-brand-700" />}
                title={selectedSlot ? `${watchedDate} às ${selectedSlot.time}` : "Selecione um horário"}
                description={
                  selectedSlot
                    ? `Atendimento com ${selectedSlot.professionalName}`
                    : "Os horários são calculados de acordo com disponibilidade real."
                }
              />
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-6">
              <StepHeader
                title="Passo 3: Dados do cliente"
                description="Preencha os dados para o salão identificar e confirmar seu atendimento."
              />

              <div className="grid gap-5 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Seu nome</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome completo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <Input placeholder="(11) 99999-9999" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail</FormLabel>
                      <FormControl>
                        <Input placeholder="voce@email.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Algo importante para o atendimento"
                          {...field}
                          value={field.value ?? ""}
                          className="min-h-[120px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="space-y-6">
              <StepHeader
                title="Passo 4: Revisar e aceitar"
                description="Confira os dados abaixo. Quando estiver tudo certo, aceite a revisão e solicite o agendamento."
              />

              <div className="grid gap-4 md:grid-cols-2">
                <ReviewBlock title="Serviço" value={selectedService?.name ?? "-"} />
                <ReviewBlock title="Profissional" value={selectedProfessional?.name ?? selectedSlot?.professionalName ?? "Qualquer profissional disponível"} />
                <ReviewBlock title="Data" value={form.getValues("date") || "-"} />
                <ReviewBlock title="Horário" value={form.getValues("time") || "-"} />
                <ReviewBlock title="Cliente" value={form.getValues("name") || "-"} />
                <ReviewBlock title="Telefone" value={form.getValues("phone") || "-"} />
              </div>

              <div className="rounded-2xl border border-border bg-muted/20 px-4 py-4">
                <p className="text-sm font-medium text-foreground">Observações</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {form.getValues("notes") || "Nenhuma observação informada."}
                </p>
              </div>

              <label className="flex items-start gap-3 rounded-2xl border border-border px-4 py-4">
                <input
                  type="checkbox"
                  checked={acceptedReview}
                  onChange={(event) => setAcceptedReview(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-border"
                />
                <span className="text-sm text-muted-foreground">
                  Revisei os dados e entendo que o salão poderá confirmar este agendamento antes do atendimento.
                </span>
              </label>
            </div>
          ) : null}
        </section>

        <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            {step < 4 ? `Etapa ${step} de 4` : "Tudo pronto para solicitar o agendamento"}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {step > 1 ? (
              <Button type="button" variant="outline" onClick={() => setStep((current) => Math.max(1, current - 1) as 1 | 2 | 3 | 4)}>
                <ChevronLeft className="h-4 w-4" />
                Voltar
              </Button>
            ) : null}

            {step < 4 ? (
              <Button type="button" onClick={goToNextStep} disabled={isLoadingSlots}>
                Continuar
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" size="lg" disabled={isSubmitting || isLoadingSlots || !acceptedReview}>
                Confirmar agendamento
              </Button>
            )}
          </div>
        </div>

        <Separator />
      </form>
    </Form>
  );
}

function StepHeader({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function SummaryStrip({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/20 px-4 py-4">
      <div className="mt-0.5">{icon}</div>
      <div>
        <p className="font-medium text-foreground">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function ReviewBlock({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border px-4 py-4">
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{title}</p>
      <p className="mt-2 font-medium text-foreground">{value}</p>
    </div>
  );
}
