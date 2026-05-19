"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { AppointmentStatus } from "@prisma/client";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { appointmentSchema } from "@/lib/validations/entities";
import { getAppointmentAvailability, upsertAppointment, updateAppointmentStatus } from "@/server/actions/domain";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  const [pendingCompletion, setPendingCompletion] = useState<{ id: string } | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [availableSlots, setAvailableSlots] = useState<Array<{ time: string; professionalId: string; professionalName: string }>>([]);
  const [isLoadingSlots, startLoadingSlots] = useTransition();
  const [isPending, startTransition] = useTransition();
  const dateInputRef = useRef<HTMLInputElement | null>(null);
  const lastAvailabilityKeyRef = useRef("");
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
  const watchedProfessionalId = form.watch("professionalId");
  const watchedAppointmentId = form.watch("id");

  function resetForNewAppointment() {
    setClientMode("existing");
    setSelectedDate("");
    setSelectedTime("");
    setAvailableSlots([]);
    lastAvailabilityKeyRef.current = "";
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

  useEffect(() => {
    if (!open || !watchedServiceId || !selectedDate) return;

    const availabilityKey = [watchedAppointmentId || "new", watchedServiceId, watchedProfessionalId || "any", selectedDate].join(":");
    if (lastAvailabilityKeyRef.current === availabilityKey) return;
    lastAvailabilityKeyRef.current = availabilityKey;

    startLoadingSlots(async () => {
      const nextSlots = await getAppointmentAvailability({
        serviceId: watchedServiceId,
        professionalId: watchedProfessionalId || undefined,
        date: selectedDate,
        currentAppointmentId: watchedAppointmentId || undefined,
      });

      setAvailableSlots(nextSlots);

      const stillAvailable = nextSlots.some(
        (slot) =>
          slot.time === selectedTime &&
          (!watchedProfessionalId || slot.professionalId === watchedProfessionalId)
      );

      if (!stillAvailable) {
        setSelectedTime("");
        form.setValue("startAt", "");
      }
    });
  }, [form, open, selectedDate, selectedTime, watchedAppointmentId, watchedProfessionalId, watchedServiceId]);

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

  async function handleStatusChange(id: string, nextStatus: AppointmentStatus) {
    const result = await updateAppointmentStatus(id, nextStatus);
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  }

  return (
    <div className="w-full">
      <section className="space-y-4">
        <div className="space-y-3 md:hidden">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="rounded-full">
              <SelectValue placeholder="Filtrar status" />
            </SelectTrigger>
            <SelectContent>
              {statusFilters.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            className="w-full"
            onClick={() => {
              resetForNewAppointment();
              setOpen(true);
            }}
          >
            Novo agendamento
          </Button>
        </div>

        <div className="hidden gap-2 overflow-auto md:flex">
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

        <div className="space-y-3 md:hidden">
          {filtered.map((item) => (
            <div key={item.id} className="rounded-[1.5rem] border border-border bg-white px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-brand-800">{formatDateTime(item.startAt)}</p>
                  <p className="mt-2 font-medium text-foreground">{item.client.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.service.name}</p>
                </div>
                <StatusBadge status={item.status} />
              </div>
              <div className="mt-4 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    const appointmentDate = new Date(item.startAt);
                    const nextDate = format(appointmentDate, "yyyy-MM-dd");
                    const nextTime = format(appointmentDate, "HH:mm");
                    setSelectedDate(nextDate);
                    setSelectedTime(nextTime);
                    lastAvailabilityKeyRef.current = "";
                    setClientMode("existing");
                    form.reset({
                      id: item.id,
                      clientMode: "existing",
                      clientId: item.clientId,
                      clientName: item.client.name,
                      clientPhone: item.client.phone ?? "",
                      professionalId: item.professionalId,
                      serviceId: item.serviceId,
                      startAt: new Date(item.startAt).toISOString(),
                      status: item.status,
                      notes: item.notes ?? "",
                    });
                    setOpen(true);
                  }}
                >
                  Editar
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1"
                  onClick={() => {
                    const nextStatus = item.status === AppointmentStatus.CONFIRMED ? AppointmentStatus.COMPLETED : AppointmentStatus.CONFIRMED;
                    if (nextStatus === AppointmentStatus.COMPLETED) {
                      setPendingCompletion({ id: item.id });
                      return;
                    }
                    startTransition(() => handleStatusChange(item.id, nextStatus));
                  }}
                >
                  {item.status === AppointmentStatus.CONFIRMED ? "Concluir" : "Confirmar"}
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden md:block">
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
                      const appointmentDate = new Date(item.startAt);
                      const nextDate = format(appointmentDate, "yyyy-MM-dd");
                      const nextTime = format(appointmentDate, "HH:mm");
                      setSelectedDate(nextDate);
                      setSelectedTime(nextTime);
                      lastAvailabilityKeyRef.current = "";
                      setClientMode("existing");
                      form.reset({
                        id: item.id,
                        clientMode: "existing",
                        clientId: item.clientId,
                        clientName: item.client.name,
                        clientPhone: item.client.phone ?? "",
                        professionalId: item.professionalId,
                        serviceId: item.serviceId,
                        startAt: new Date(item.startAt).toISOString(),
                        status: item.status,
                        notes: item.notes ?? "",
                      });
                      setOpen(true);
                    }}>Editar</Button>
                    <Button type="button" variant="ghost" onClick={() => {
                      const nextStatus = item.status === AppointmentStatus.CONFIRMED ? AppointmentStatus.COMPLETED : AppointmentStatus.CONFIRMED;
                      if (nextStatus === AppointmentStatus.COMPLETED) {
                        setPendingCompletion({ id: item.id });
                        return;
                      }
                      startTransition(() => handleStatusChange(item.id, nextStatus));
                    }}>
                      {item.status === AppointmentStatus.CONFIRMED ? "Concluir" : "Confirmar"}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle>{form.getValues("id") ? "Editar agendamento" : "Novo agendamento"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((values) => startTransition(async () => {
              const result = await upsertAppointment({
                ...values,
                clientMode,
                startAt: values.startAt,
              });
              if (result.success) {
                toast.success(result.message);
                setOpen(false);
              } else {
                toast.error(result.message);
              }
            }))} className="space-y-5">
              <div className="space-y-2.5">
                <Label>Cliente</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    className={cn(
                      "flex items-center gap-3 rounded-full border px-4 py-2.5 text-left transition-colors",
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
                      "flex items-center gap-3 rounded-full border px-4 py-2.5 text-left transition-colors",
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
                      <FormItem className="relative">
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
                        {matchingClients.length ? (
                          <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-border bg-white shadow-lg">
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
                                <span className="text-sm text-muted-foreground">{item.phone || ""}</span>
                              </button>
                            ))}
                          </div>
                        ) : null}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
              <div className="rounded-[1.5rem] border border-border bg-[#fffaf9] px-4 py-4 sm:px-5">
                <div className="grid gap-4 md:grid-cols-[240px_1fr]">
                  <FormItem>
                    <FormLabel>Data</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={selectedDate}
                        ref={dateInputRef}
                        onChange={(event) => {
                          setSelectedDate(event.target.value);
                          setSelectedTime("");
                          lastAvailabilityKeyRef.current = "";
                          form.setValue("startAt", "");
                        }}
                        onClick={() => {
                          const input = dateInputRef.current;
                          if (input && "showPicker" in input) {
                            input.showPicker();
                          }
                        }}
                      />
                    </FormControl>
                  </FormItem>
                  <FormField
                    control={form.control}
                    name="startAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Horários disponíveis</FormLabel>
                        <div className="space-y-3">
                          <div className="flex min-h-[56px] flex-wrap content-start items-start gap-2">
                            {availableSlots.length ? (
                              availableSlots.map((slot) => (
                                <button
                                  key={`${slot.professionalId}-${slot.time}`}
                                  type="button"
                                  onClick={() => {
                                    setSelectedTime(slot.time);
                                    form.setValue("professionalId", slot.professionalId, { shouldValidate: true });
                                    field.onChange(new Date(`${selectedDate}T${slot.time}:00`).toISOString());
                                  }}
                                  className={cn(
                                    "rounded-full border px-3 py-2 text-sm transition-colors",
                                    selectedTime === slot.time
                                      ? "border-primary bg-primary text-primary-foreground"
                                      : "border-border bg-background hover:bg-muted"
                                  )}
                                >
                                  {slot.time}
                                </button>
                              ))
                            ) : (
                              <p className="text-sm text-muted-foreground">
                                {selectedDate
                                  ? isLoadingSlots
                                    ? "Carregando horários..."
                                    : "Nenhum horário disponível para esta data."
                                  : "Escolha uma data para ver os horários."}
                              </p>
                            )}
                          </div>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              <div className="flex gap-2 border-t border-border pt-4">
                <Button type="submit" disabled={isPending}>Salvar agendamento</Button>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(pendingCompletion)} onOpenChange={(open) => !open && setPendingCompletion(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Concluir atendimento</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja concluir e encerrar esse serviço?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!pendingCompletion) return;
                startTransition(() => handleStatusChange(pendingCompletion.id, AppointmentStatus.COMPLETED));
                setPendingCompletion(null);
              }}
            >
              Concluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
