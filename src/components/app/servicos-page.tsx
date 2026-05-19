"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { serviceSchema } from "@/lib/validations/entities";
import { toggleServiceStatus, upsertService } from "@/server/actions/domain";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatMoney } from "@/lib/utils";
import { EmptyState } from "@/components/shared/empty-state";
import { toast } from "@/components/ui/use-toast";

function formatCentsToCurrencyInput(valueInCents: number) {
  return (valueInCents / 100).toFixed(2).replace(".", ",");
}

function formatDigitsToCurrencyInput(value: string) {
  const digits = value.replace(/\D/g, "");
  const cents = Number(digits || "0");
  return formatCentsToCurrencyInput(cents);
}

function parseCurrencyInputToCents(value: string) {
  const normalized = value.replace(/\./g, "").replace(",", ".").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

export function ServicosPage({
  services,
  professionals,
}: {
  services: Array<{
    id: string;
    name: string;
    description: string | null;
    durationMinutes: number;
    priceInCents: number;
    isActive: boolean;
    professionalServices: Array<{ professional: { id: string; name: string } }>;
  }>;
  professionals: Array<{ id: string; name: string }>;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const form = useForm<any>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: "",
      description: "",
      durationMinutes: 60,
      priceInCents: "0,00",
      isActive: true,
      professionalIds: [],
    },
  });

  function onSubmit(values: any) {
    startTransition(async () => {
      const result = await upsertService({
        ...values,
        priceInCents: parseCurrencyInputToCents(values.priceInCents),
      });
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
      if (result.success) {
        setSelectedId(null);
        form.reset({ name: "", description: "", durationMinutes: 60, priceInCents: "0,00", isActive: true, professionalIds: [] });
        setOpen(false);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          type="button"
          className="w-full md:w-auto"
          onClick={() => {
            setSelectedId(null);
            form.reset({ name: "", description: "", durationMinutes: 60, priceInCents: "0,00", isActive: true, professionalIds: [] });
            setOpen(true);
          }}
        >
          Novo serviço
        </Button>
      </div>
      <section className="space-y-3">
        {services.length ? (
          services.map((service) => (
            <div key={service.id} className="rounded-[1.5rem] border border-border bg-white p-4 md:p-5">
              <div className="flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-foreground">{service.name}</h3>
                    <p className="mt-2 text-sm text-foreground">
                      {service.durationMinutes} min • {formatMoney(service.priceInCents)}
                    </p>
                  </div>
                  {!service.isActive ? (
                    <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">Inativo</span>
                  ) : null}
                </div>

                {service.description ? (
                  <p className="text-sm text-muted-foreground">{service.description}</p>
                ) : null}

                <div className="flex gap-2 border-t border-border pt-4">
                  <Button type="button" variant="outline" onClick={() => {
                    setSelectedId(service.id);
                    form.reset({
                      id: service.id,
                      name: service.name,
                      description: service.description ?? "",
                      durationMinutes: service.durationMinutes,
                      priceInCents: formatCentsToCurrencyInput(service.priceInCents),
                      isActive: service.isActive,
                      professionalIds: service.professionalServices.map((item) => item.professional.id),
                    });
                    setOpen(true);
                  }} className="flex-1 md:flex-none">
                    Editar
                  </Button>
                  <Button type="button" variant="ghost" className="flex-1 md:flex-none" onClick={() => startTransition(async () => {
                    const result = await toggleServiceStatus(service.id);
                    if (result.success) {
                      toast.success(result.message);
                    } else {
                      toast.error(result.message);
                    }
                  })}>
                    {service.isActive ? "Desativar" : "Ativar"}
                  </Button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <EmptyState title="Nenhum serviço cadastrado" description="Monte seu catálogo com duração, preço e profissionais vinculados." />
        )}
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedId ? "Editar serviço" : "Novo serviço"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => <FormItem><FormLabel>Nome</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
              <FormField control={form.control} name="description" render={({ field }) => <FormItem><FormLabel>Descrição</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>} />
              <div className="grid gap-4 md:grid-cols-2">
                <FormField control={form.control} name="durationMinutes" render={({ field }) => <FormItem><FormLabel>Duração (min)</FormLabel><FormControl><Input type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value))} /></FormControl><FormMessage /></FormItem>} />
                <FormField
                  control={form.control}
                  name="priceInCents"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preço (R$)</FormLabel>
                      <FormControl>
                        <Input
                          inputMode="numeric"
                          placeholder="150,00"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(formatDigitsToCurrencyInput(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="professionalIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Profissionais vinculados</FormLabel>
                    <div className="grid gap-2 rounded-2xl bg-muted/50 p-4">
                      {professionals.map((professional) => {
                        const checked = field.value?.includes(professional.id);
                        return (
                          <label key={professional.id} className="flex items-center gap-3 text-sm">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(event) => {
                                const next = event.target.checked
                                  ? [...(field.value ?? []), professional.id]
                                  : (field.value ?? []).filter((id: string) => id !== professional.id);
                                field.onChange(next);
                              }}
                            />
                            <span>{professional.name}</span>
                          </label>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2">
                <Button type="submit" disabled={isPending}>Salvar serviço</Button>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
