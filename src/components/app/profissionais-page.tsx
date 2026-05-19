"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { WeekDay } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { professionalSchema } from "@/lib/validations/entities";
import { toggleProfessionalStatus, updateProfessionalBusinessHours, upsertProfessional } from "@/server/actions/domain";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { toast } from "@/components/ui/use-toast";

const weekDayLabels: Array<{ value: WeekDay; label: string }> = [
  { value: WeekDay.MONDAY, label: "Segunda" },
  { value: WeekDay.TUESDAY, label: "Terça" },
  { value: WeekDay.WEDNESDAY, label: "Quarta" },
  { value: WeekDay.THURSDAY, label: "Quinta" },
  { value: WeekDay.FRIDAY, label: "Sexta" },
  { value: WeekDay.SATURDAY, label: "Sábado" },
  { value: WeekDay.SUNDAY, label: "Domingo" },
];

function createDefaultSchedule() {
  return weekDayLabels.map((day) => ({
    weekDay: day.value,
    isActive: day.value !== WeekDay.SUNDAY,
    startTime: "09:00",
    endTime: "18:00",
  }));
}

export function ProfissionaisPage({
  professionals,
  services,
}: {
  professionals: Array<{
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    bio: string | null;
    isActive: boolean;
    professionalServices: Array<{ service: { id: string; name: string } }>;
    businessHours: Array<{
      weekDay: WeekDay;
      startTime: string;
      endTime: string;
    }>;
  }>;
  services: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSchedulePending, startScheduleTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scheduleProfessional, setScheduleProfessional] = useState<(typeof professionals)[number] | null>(null);
  const [open, setOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleDays, setScheduleDays] = useState(createDefaultSchedule());
  const form = useForm<any>({
    resolver: zodResolver(professionalSchema),
    defaultValues: { name: "", phone: "", email: "", bio: "", isActive: true, serviceIds: [] },
  });

  function onSubmit(values: any) {
    startTransition(async () => {
      const result = await upsertProfessional(values);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
      if (result.success) {
        setSelectedId(null);
        form.reset({ name: "", phone: "", email: "", bio: "", isActive: true, serviceIds: [] });
        setOpen(false);
      }
    });
  }

  function edit(item: (typeof professionals)[number]) {
    setSelectedId(item.id);
    form.reset({
      id: item.id,
      name: item.name,
      phone: item.phone ?? "",
      email: item.email ?? "",
      bio: item.bio ?? "",
      isActive: item.isActive,
      serviceIds: item.professionalServices.map((entry) => entry.service.id),
    });
    setOpen(true);
  }

  function openSchedule(item: (typeof professionals)[number]) {
    const nextSchedule = weekDayLabels.map((day) => {
      const existing = item.businessHours.find((hour) => hour.weekDay === day.value);
      return {
        weekDay: day.value,
        isActive: Boolean(existing),
        startTime: existing?.startTime ?? "09:00",
        endTime: existing?.endTime ?? "18:00",
      };
    });

    setScheduleProfessional(item);
    setScheduleDays(nextSchedule);
    setScheduleOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          type="button"
          className="w-full md:w-auto"
          onClick={() => {
            setSelectedId(null);
            form.reset({ name: "", phone: "", email: "", bio: "", isActive: true, serviceIds: [] });
            setOpen(true);
          }}
        >
          Novo profissional
        </Button>
      </div>
      <section className="space-y-3">
        {professionals.length ? (
          professionals.map((professional) => (
            <div key={professional.id} className="rounded-[1.5rem] border border-border bg-white p-4 md:p-5">
              <div className="flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-foreground">{professional.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{professional.email || professional.phone || "Sem contato informado"}</p>
                  </div>
                  {!professional.isActive ? (
                    <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">Inativo</span>
                  ) : null}
                </div>

                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    {professional.professionalServices.map((item) => item.service.name).join(" • ") || "Sem serviços vinculados"}
                  </p>
                  <p className="text-sm text-muted-foreground">{professional.bio || "Sem bio cadastrada."}</p>
                </div>

                <div className="flex gap-2 border-t border-border pt-4">
                  <Button type="button" variant="outline" className="flex-1 md:flex-none" onClick={() => edit(professional)}>Editar</Button>
                  <Button type="button" variant="ghost" className="flex-1 md:flex-none" onClick={() => openSchedule(professional)}>
                    Horários
                  </Button>
                  <Button type="button" variant="ghost" className="flex-1 md:flex-none" onClick={() => startTransition(async () => {
                    const result = await toggleProfessionalStatus(professional.id);
                    if (result.success) {
                      toast.success(result.message);
                    } else {
                      toast.error(result.message);
                    }
                  })}>
                    {professional.isActive ? "Desativar" : "Ativar"}
                  </Button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <EmptyState title="Nenhum profissional cadastrado" description="Cadastre profissionais e vincule os serviços realizados por cada um." />
        )}
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedId ? "Editar profissional" : "Novo profissional"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => <FormItem><FormLabel>Nome</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
              <FormField control={form.control} name="phone" render={({ field }) => <FormItem><FormLabel>Telefone</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>} />
              <FormField control={form.control} name="email" render={({ field }) => <FormItem><FormLabel>E-mail</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>} />
              <FormField control={form.control} name="bio" render={({ field }) => <FormItem><FormLabel>Bio</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>} />
              <FormField
                control={form.control}
                name="serviceIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Serviços realizados</FormLabel>
                    <div className="grid gap-2 rounded-2xl bg-muted/50 p-4">
                      {services.map((service) => {
                        const checked = field.value?.includes(service.id);
                        return (
                          <label key={service.id} className="flex items-center gap-3 text-sm">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(event) => {
                                const next = event.target.checked
                                  ? [...(field.value ?? []), service.id]
                                  : (field.value ?? []).filter((id: string) => id !== service.id);
                                field.onChange(next);
                              }}
                            />
                            <span>{service.name}</span>
                          </label>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2">
                <Button type="submit" disabled={isPending}>Salvar profissional</Button>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Horários de atendimento</DialogTitle>
            <DialogDescription>
              Defina a rotina semanal de {scheduleProfessional?.name ?? "atendimento"}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {scheduleDays.map((day, index) => (
              <div
                key={day.weekDay}
                className="grid gap-3 rounded-2xl border border-border px-4 py-3 sm:grid-cols-[120px_110px_1fr_1fr]"
              >
                <label className="flex items-center gap-3 text-sm font-medium text-foreground">
                  <input
                    type="checkbox"
                    checked={day.isActive}
                    onChange={(event) =>
                      setScheduleDays((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, isActive: event.target.checked } : item
                        )
                      )
                    }
                  />
                  <span>{weekDayLabels.find((item) => item.value === day.weekDay)?.label}</span>
                </label>

                <div className="rounded-full bg-muted px-3 py-2 text-center text-sm text-muted-foreground">
                  {day.isActive ? "Ativo" : "Fechado"}
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Início</label>
                  <Input
                    type="time"
                    value={day.startTime}
                    disabled={!day.isActive}
                    onChange={(event) =>
                      setScheduleDays((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, startTime: event.target.value } : item
                        )
                      )
                    }
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Fim</label>
                  <Input
                    type="time"
                    value={day.endTime}
                    disabled={!day.isActive}
                    onChange={(event) =>
                      setScheduleDays((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, endTime: event.target.value } : item
                        )
                      )
                    }
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              disabled={isSchedulePending || !scheduleProfessional}
              onClick={() => {
                if (!scheduleProfessional) return;

                startScheduleTransition(async () => {
                  const result = await updateProfessionalBusinessHours({
                    professionalId: scheduleProfessional.id,
                    days: scheduleDays,
                  });

                  if (result.success) {
                    toast.success(result.message);
                    setScheduleOpen(false);
                    router.refresh();
                  } else {
                    toast.error(result.message);
                  }
                });
              }}
            >
              Salvar horários
            </Button>
            <Button type="button" variant="outline" onClick={() => setScheduleOpen(false)}>
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
