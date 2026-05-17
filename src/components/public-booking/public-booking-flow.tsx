"use client";

import { useEffect, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { publicBookingSchema } from "@/lib/validations/entities";
import { createPublicBooking, getPublicAvailability } from "@/server/actions/domain";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { Separator } from "@/components/ui/separator";

type Props = {
  slug: string;
  services: Array<{ id: string; name: string }>;
  professionals: Array<{ id: string; name: string; serviceIds: string[] }>;
  slots: Array<{ time: string; professionalId: string; professionalName: string }>;
};

export function PublicBookingFlow({ slug, services, professionals, slots }: Props) {
  const [isPending, startTransition] = useTransition();
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>("");
  const [availableSlots, setAvailableSlots] = useState(slots);
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
  const watchedDate = form.watch("date");
  const availableProfessionals = professionals.filter((professional) => professional.serviceIds.includes(watchedServiceId));

  useEffect(() => {
    if (!watchedServiceId || !watchedDate) return;

    const currentProfessionalId = form.getValues("professionalId");
    if (currentProfessionalId && !availableProfessionals.some((professional) => professional.id === currentProfessionalId)) {
      form.setValue("professionalId", "");
      setSelectedProfessionalId("");
    }

    startTransition(async () => {
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
  }, [availableProfessionals, form, selectedProfessionalId, slug, watchedDate, watchedServiceId]);

  function onSubmit(values: any) {
    startTransition(async () => {
      const result = await createPublicBooking(values);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Agendamento solicitado com sucesso.");
      form.reset({
        ...form.getValues(),
        time: "",
        name: "",
        phone: "",
        email: "",
        notes: "",
      });
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
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
                  <p className="text-sm text-muted-foreground">Nenhuma profissional ativa realiza este serviço no momento.</p>
                ) : null}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-[220px_1fr]">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
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
                <div className="flex flex-wrap gap-2">
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
                        className={`rounded-full border px-3 py-2 text-sm ${field.value === slot.time ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"}`}
                      >
                        {slot.time}
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhum horário disponível para os filtros atuais.</p>
                  )}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        <div className="grid gap-4 md:grid-cols-2">
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

        <div className="grid gap-4 md:grid-cols-2">
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
                  <Input placeholder="Algo importante para o atendimento" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" size="lg" disabled={isPending}>
          Confirmar agendamento
        </Button>
      </form>
    </Form>
  );
}
