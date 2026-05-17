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
import { formatMoney } from "@/lib/utils";
import { EmptyState } from "@/components/shared/empty-state";
import { toast } from "@/components/ui/use-toast";

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
  const [isPending, startTransition] = useTransition();
  const form = useForm<any>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: "",
      description: "",
      durationMinutes: 60,
      priceInCents: 0,
      isActive: true,
      professionalIds: [],
    },
  });

  function onSubmit(values: any) {
    startTransition(async () => {
      const result = await upsertService(values);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
      if (result.success) {
        setSelectedId(null);
        form.reset({ name: "", description: "", durationMinutes: 60, priceInCents: 0, isActive: true, professionalIds: [] });
      }
    });
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
      <section className="space-y-3">
        {services.length ? (
          services.map((service) => (
            <div key={service.id} className="rounded-2xl border border-border bg-white p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="font-semibold">{service.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{service.description || "Sem descrição"}</p>
                  <p className="mt-3 text-sm">
                    {service.durationMinutes} min • {formatMoney(service.priceInCents)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => {
                    setSelectedId(service.id);
                    form.reset({
                      id: service.id,
                      name: service.name,
                      description: service.description ?? "",
                      durationMinutes: service.durationMinutes,
                      priceInCents: service.priceInCents,
                      isActive: service.isActive,
                      professionalIds: service.professionalServices.map((item) => item.professional.id),
                    });
                  }}>
                    Editar
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => startTransition(async () => {
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
      <section className="rounded-3xl border border-border bg-white p-6">
        <h3 className="text-lg font-semibold">{selectedId ? "Editar serviço" : "Novo serviço"}</h3>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => <FormItem><FormLabel>Nome</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
            <FormField control={form.control} name="description" render={({ field }) => <FormItem><FormLabel>Descrição</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>} />
            <div className="grid gap-4 md:grid-cols-2">
              <FormField control={form.control} name="durationMinutes" render={({ field }) => <FormItem><FormLabel>Duração (min)</FormLabel><FormControl><Input type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value))} /></FormControl><FormMessage /></FormItem>} />
              <FormField control={form.control} name="priceInCents" render={({ field }) => <FormItem><FormLabel>Preço em centavos</FormLabel><FormControl><Input type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value))} /></FormControl><FormMessage /></FormItem>} />
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
            <Button type="submit" disabled={isPending}>Salvar serviço</Button>
          </form>
        </Form>
      </section>
    </div>
  );
}
