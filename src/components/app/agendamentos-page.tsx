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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn, formatDateTime } from "@/lib/utils";
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
  clients: Array<{ id: string; name: string; phone?: string | null; email?: string | null }>;
  professionals: Array<{ id: string; name: string }>;
  services: Array<{
    id: string;
    name: string;
    professionalServices: Array<{ professional: { id: string; name: string } }>;
  }>;
}) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [clientMode, setClientMode] = useState<"existing" | "new">("existing");
  const [isPending, startTransition] = useTransition();
  const form = useForm<any>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      clientMode: "existing",
      clientId: "",
      clientName: "",
      clientPhone: "",
      professionalId: professionals[0]?.id ?? "",
      serviceId: services[0]?.id ?? "",
      startAt: "",
      status: AppointmentStatus.CONFIRMED,
      notes: "",
    },
  });
  const watchedServiceId = form.watch("serviceId");
  const watchedClientName = form.watch("clientName");

  function resetForNewAppointment() {
    setClientMode("existing");
    form.reset({
      clientMode: "existing",
      clientId: "",
      clientName: "",
      clientPhone: "",
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
  const matchingClients = useMemo(() => {
    const query = watchedClientName?.trim().toLowerCase();

    if (clientMode !== "existing" || !query) {
      return [];
    }

    return clients
      .filter((item) => item.name.toLowerCase().includes(query))
      .slice(0, 6);
  }, [clientMode, clients, watchedClientName]);

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
                      setClientMode("existing");
                      form.reset({
                        id: item.id,
                        clientMode: "existing",
                        clientId: item.clientId,
                        clientName: item.client.name,
                        clientPhone: item.client.phone ?? "",
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
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((values) => startTransition(async () => {
              const result = await upsertAppointment({
                ...values,
                clientMode,
                startAt: new Date(values.startAt).toISOString(),
              });
              if (result.success) {
                toast.success(result.message);
                setOpen(false);
              } else {
                toast.error(result.message);
              }
            }))} className="space-y-4">
              <div className="space-y-3">
                <Label>Cliente</Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    className={cn(
                      "flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors",
                      clientMode === "new" ? "border-primary bg-primary/5" : "border-border bg-background"
                    )}
                    onClick={() => {
                      setClientMode("new");
                      form.setValue("clientMode", "new");
                      form.setValue("clientId", "");
                      form.setValue("clientName", "");
                      form.setValue("clientPhone", "");
                    }}
                  >
                    <span className={cn("h-4 w-4 rounded-full border", clientMode === "new" ? "border-primary bg-primary" : "border-border")} />
                    <span className="font-medium">Novo cliente</span>
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors",
                      clientMode === "existing" ? "border-primary bg-primary/5" : "border-border bg-background"
                    )}
                    onClick={() => {
                      setClientMode("existing");
                      form.setValue("clientMode", "existing");
                      form.setValue("clientId", "");
                      form.setValue("clientName", "");
                      form.setValue("clientPhone", "");
                    }}
                  >
                    <span className={cn("h-4 w-4 rounded-full border", clientMode === "existing" ? "border-primary bg-primary" : "border-border")} />
                    <span className="font-medium">Cliente já existente</span>
                  </button>
                </div>
              </div>

              {clientMode === "new" ? (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="clientName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Nome do cliente"
                              onChange={(event) => {
                                field.onChange(event);
                                form.setValue("clientId", "");
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="clientPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefone</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Telefone do cliente"
                              onChange={(event) => {
                                field.onChange(event);
                                form.setValue("clientId", "");
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <FormField
                    control={form.control}
                    name="clientName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Busque um cliente"
                            onChange={(event) => {
                              field.onChange(event);
                              form.setValue("clientId", "");
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {matchingClients.length ? (
                    <div className="rounded-lg border border-border">
                      {matchingClients.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className="flex w-full items-start justify-between gap-4 border-b border-border px-4 py-3 text-left last:border-b-0 hover:bg-muted"
                          onClick={() => {
                            form.setValue("clientId", item.id, { shouldValidate: true });
                            form.setValue("clientName", item.name, { shouldValidate: true });
                            form.setValue("clientPhone", item.phone ?? "");
                          }}
                        >
                          <span className="font-medium">{item.name}</span>
                          <span className="text-sm text-muted-foreground">{item.phone || item.email || ""}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}
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
