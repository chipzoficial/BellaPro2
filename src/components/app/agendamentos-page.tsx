"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { AppointmentStatus } from "@prisma/client";
import { useForm } from "react-hook-form";
import { appointmentSchema } from "@/lib/validations/entities";
import { upsertAppointment, updateAppointmentStatus } from "@/server/actions/domain";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";

const statusFilters = [
  { value: "all", label: "Todos" },
  { value: AppointmentStatus.PENDING, label: "Pendente" },
  { value: AppointmentStatus.CONFIRMED, label: "Confirmado" },
  { value: AppointmentStatus.COMPLETED, label: "Concluído" },
  { value: AppointmentStatus.CANCELED, label: "Cancelado" },
  { value: AppointmentStatus.NO_SHOW, label: "Não compareceu" },
] as const;

export function AgendamentosPage({
  initialOpen = false,
  appointments,
  clients,
  professionals,
  services,
}: {
  initialOpen?: boolean;
  appointments: Array<any>;
  clients: Array<{ id: string; name: string }>;
  professionals: Array<{ id: string; name: string }>;
  services: Array<{
    id: string;
    name: string;
    professionalServices: Array<{ professional: { id: string; name: string } }>;
  }>;
}) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const form = useForm<any>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      clientId: clients[0]?.id ?? "",
      professionalId: professionals[0]?.id ?? "",
      serviceId: services[0]?.id ?? "",
      startAt: "",
      status: AppointmentStatus.CONFIRMED,
      notes: "",
    },
  });
  const watchedServiceId = form.watch("serviceId");

  function resetForNewAppointment() {
    form.reset({
      clientId: clients[0]?.id ?? "",
      professionalId: professionals[0]?.id ?? "",
      serviceId: services[0]?.id ?? "",
      startAt: "",
      status: AppointmentStatus.CONFIRMED,
      notes: "",
    });
  }

  useEffect(() => {
    if (!initialOpen) return;

    resetForNewAppointment();
    setOpen(true);
  }, [initialOpen]);

  const availableProfessionals = useMemo(() => {
    const selectedService = services.find((service) => service.id === watchedServiceId);
    if (!selectedService) return professionals;

    const allowedIds = new Set(selectedService.professionalServices.map((entry) => entry.professional.id));
    return professionals.filter((professional) => allowedIds.has(professional.id));
  }, [professionals, services, watchedServiceId]);

  useEffect(() => {
    const currentProfessionalId = form.getValues("professionalId");
    if (!currentProfessionalId) return;

    const stillAllowed = availableProfessionals.some((professional) => professional.id === currentProfessionalId);
    if (!stillAllowed) {
      form.setValue("professionalId", availableProfessionals[0]?.id ?? "", {
        shouldValidate: true,
      });
    }
  }, [availableProfessionals, form]);

  const filtered = useMemo(
    () => appointments.filter((item) => (statusFilter === "all" ? true : item.status === statusFilter)),
    [appointments, statusFilter]
  );

  return (
    <div className="w-full">
      <section className="space-y-4">
        <div className="flex gap-2 overflow-auto">
          {statusFilters.map((status) => (
            <Button key={status.value} type="button" variant={statusFilter === status.value ? "default" : "outline"} onClick={() => setStatusFilter(status.value)}>
              {status.label}
            </Button>
          ))}
          <Button
            type="button"
            className="ml-auto"
            onClick={() => {
              resetForNewAppointment();
              setOpen(true);
            }}
          >
            Novo agendamento
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quando</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Serviço</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{formatDateTime(item.startAt)}</TableCell>
                <TableCell>{item.client.name}</TableCell>
                <TableCell>{item.service.name}</TableCell>
                <TableCell><StatusBadge status={item.status} /></TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={() => {
                      form.reset({
                        id: item.id,
                        clientId: item.clientId,
                        professionalId: item.professionalId,
                        serviceId: item.serviceId,
                        startAt: new Date(item.startAt).toISOString().slice(0, 16),
                        status: item.status,
                        notes: item.notes ?? "",
                      });
                      setOpen(true);
                    }}>Editar</Button>
                    <Button type="button" variant="ghost" onClick={() => startTransition(async () => {
                      const nextStatus = item.status === AppointmentStatus.CONFIRMED ? AppointmentStatus.COMPLETED : AppointmentStatus.CONFIRMED;
                      const result = await updateAppointmentStatus(item.id, nextStatus);
                      if (result.success) {
                        toast.success(result.message);
                      } else {
                        toast.error(result.message);
                      }
                    })}>
                      {item.status === AppointmentStatus.CONFIRMED ? "Concluir" : "Confirmar"}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.getValues("id") ? "Editar agendamento" : "Novo agendamento"}</DialogTitle>
            <DialogDescription>Abra o formulário somente quando for realmente criar ou editar um atendimento.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((values) => startTransition(async () => {
              const result = await upsertAppointment({
                ...values,
                startAt: new Date(values.startAt).toISOString(),
              });
              if (result.success) {
                toast.success(result.message);
                setOpen(false);
              } else {
                toast.error(result.message);
              }
            }))} className="space-y-4">
              <FormField control={form.control} name="clientId" render={({ field }) => <FormItem><FormLabel>Cliente</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{clients.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} />
              <FormField control={form.control} name="serviceId" render={({ field }) => <FormItem><FormLabel>Serviço</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{services.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} />
              <FormField
                control={form.control}
                name="professionalId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Profissional</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!availableProfessionals.length}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma profissional" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableProfessionals.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!availableProfessionals.length ? (
                      <p className="text-sm text-muted-foreground">Nenhuma profissional ativa realiza este serviço.</p>
                    ) : null}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="startAt" render={({ field }) => <FormItem><FormLabel>Data e hora</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl><FormMessage /></FormItem>} />
              <div className="flex gap-2">
                <Button type="submit" disabled={isPending}>Salvar agendamento</Button>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
