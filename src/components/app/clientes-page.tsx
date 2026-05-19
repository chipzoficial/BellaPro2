"use client";

import { AppointmentStatus } from "@prisma/client";
import { useMemo, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { formatDateTime, formatMoney } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { clientSchema } from "@/lib/validations/entities";
import { deleteClient, upsertClient } from "@/server/actions/domain";
import { SearchInput } from "@/components/shared/search-input";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { toast } from "@/components/ui/use-toast";

type ClientInput = {
  id?: string;
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
};

export function ClientesPage({
  initialClients,
}: {
  initialClients: Array<{
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    notes: string | null;
    appointments: Array<{
      id: string;
      startAt: Date;
      status: AppointmentStatus;
      priceInCents: number;
      professional: { name: string };
      service: { name: string };
    }>;
  }>;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<ClientInput>({
    resolver: zodResolver(clientSchema),
    defaultValues: { name: "", phone: "", email: "", notes: "" },
  });

  const filtered = useMemo(
    () =>
      initialClients.filter((item) =>
        [item.name, item.phone, item.email].some((value) => value?.toLowerCase().includes(query.toLowerCase()))
      ),
    [initialClients, query]
  );
  const selectedClient = useMemo(
    () => initialClients.find((client) => client.id === selectedClientId) ?? null,
    [initialClients, selectedClientId]
  );

  function onSubmit(values: ClientInput) {
    startTransition(async () => {
      const result = await upsertClient(values);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      form.reset({ name: "", phone: "", email: "", notes: "" });
      setOpen(false);
    });
  }

  function editClient(client: (typeof initialClients)[number]) {
    form.reset({
      id: client.id,
      name: client.name,
      phone: client.phone ?? "",
      email: client.email ?? "",
      notes: client.notes ?? "",
    });
    setOpen(true);
  }

  function openClientDetails(client: (typeof initialClients)[number]) {
    setSelectedClientId(client.id);
    setDetailsOpen(true);
  }

  function removeClient(id: string) {
    startTransition(async () => {
      const result = await deleteClient(id);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <SearchInput placeholder="Buscar por nome, telefone ou e-mail" value={query} onChange={(e) => setQuery(e.target.value)} />
        <Button
          type="button"
          onClick={() => {
            form.reset({ name: "", phone: "", email: "", notes: "" });
            setOpen(true);
          }}
        >
          Novo cliente
        </Button>
      </div>
      <section>
        {filtered.length ? (
          <>
            <div className="space-y-3 md:hidden">
              {filtered.map((client) => (
                <div key={client.id} className="rounded-[1.5rem] border border-border bg-white px-4 py-4">
                  <div className="space-y-3">
                    <button type="button" className="block w-full text-left" onClick={() => openClientDetails(client)}>
                      <p className="font-medium text-foreground">{client.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{client.phone || client.email || "Sem contato"}</p>
                    </button>
                    {client.notes ? (
                      <div className="rounded-[1.25rem] bg-[#fffaf9] px-3 py-3">
                        <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">Observações</p>
                        <p className="mt-2 text-sm text-foreground">{client.notes}</p>
                      </div>
                    ) : null}
                    <div className="flex gap-2">
                      <Button type="button" variant="ghost" className="flex-1" onClick={() => openClientDetails(client)}>
                        Ver ficha
                      </Button>
                      <Button type="button" variant="outline" className="flex-1" onClick={() => editClient(client)}>
                        Editar
                      </Button>
                      <Button type="button" variant="ghost" className="flex-1" onClick={() => removeClient(client.id)}>
                        Remover
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Observações</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
              {filtered.map((client) => (
                <TableRow key={client.id}>
                  <TableCell>
                    <button
                      type="button"
                      className="font-medium text-foreground transition-colors hover:text-brand-700"
                      onClick={() => openClientDetails(client)}
                    >
                      {client.name}
                    </button>
                  </TableCell>
                  <TableCell>{client.phone || client.email || "—"}</TableCell>
                  <TableCell className="max-w-xs truncate">{client.notes || "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="ghost" onClick={() => openClientDetails(client)}>
                        Ver ficha
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => editClient(client)}>
                        Editar
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => removeClient(client.id)}>
                        Remover
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
                </TableBody>
              </Table>
            </div>
          </>
        ) : (
          <EmptyState title="Nenhum cliente encontrado" description="Cadastre clientes para organizar o histórico e acelerar novos agendamentos." />
        )}
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{form.getValues("id") ? "Editar cliente" : "Novo cliente"}</DialogTitle>
            <DialogDescription>Cadastre ou ajuste os dados do cliente.</DialogDescription>
            </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => <FormItem><FormLabel>Nome</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
              <FormField control={form.control} name="phone" render={({ field }) => <FormItem><FormLabel>Telefone</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>} />
              <FormField control={form.control} name="email" render={({ field }) => <FormItem><FormLabel>E-mail</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>} />
              <FormField control={form.control} name="notes" render={({ field }) => <FormItem><FormLabel>Observações</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>} />
              <div className="flex gap-2">
                <Button type="submit" disabled={isPending}>Salvar cliente</Button>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto">
          {selectedClient ? (
            <ClientDetails
              client={selectedClient}
              onEdit={() => {
                setDetailsOpen(false);
                editClient(selectedClient);
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ClientDetails({
  client,
  onEdit,
}: {
  client: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    notes: string | null;
    appointments: Array<{
      id: string;
      startAt: Date;
      status: AppointmentStatus;
      priceInCents: number;
      professional: { name: string };
      service: { name: string };
    }>;
  };
  onEdit: () => void;
}) {
  const now = new Date();
  const completedAppointments = client.appointments.filter((appointment) => appointment.status === AppointmentStatus.COMPLETED);
  const nextAppointment = [...client.appointments]
    .filter(
      (appointment) =>
        new Date(appointment.startAt) >= now &&
        (appointment.status === AppointmentStatus.PENDING || appointment.status === AppointmentStatus.CONFIRMED)
    )
    .sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt))[0];
  const lastVisit = [...completedAppointments].sort((a, b) => +new Date(b.startAt) - +new Date(a.startAt))[0];
  const totalSpent = completedAppointments.reduce((total, appointment) => total + appointment.priceInCents, 0);

  return (
    <>
      <DialogHeader>
        <DialogTitle>Ficha do cliente</DialogTitle>
        <DialogDescription>{client.name}</DialogDescription>
      </DialogHeader>

      <div className="space-y-6">
        <section className="space-y-4 border-b border-border pb-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h3 className="text-2xl font-semibold text-foreground">{client.name}</h3>
              <p className="text-sm text-muted-foreground">{client.phone || client.email || "Sem contato cadastrado"}</p>
            </div>
            <Button type="button" variant="outline" onClick={onEdit}>
              Editar cliente
            </Button>
          </div>

          {client.notes ? (
            <div className="rounded-[22px] bg-[#fffaf9] px-4 py-4">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Observações</p>
              <p className="mt-2 text-sm text-foreground">{client.notes}</p>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <ClientMetric
              label="Atendimentos"
              value={String(client.appointments.length)}
              helper="Total no histórico"
            />
            <ClientMetric
              label="Concluídos"
              value={String(completedAppointments.length)}
              helper="Já finalizados"
            />
            <ClientMetric
              label="Última visita"
              value={lastVisit ? formatDateTime(lastVisit.startAt, "dd/MM/yyyy") : "—"}
              helper={lastVisit ? lastVisit.service.name : "Sem concluídos"}
            />
            <ClientMetric
              label="Total gasto"
              value={formatMoney(totalSpent)}
              helper="Com base em concluídos"
            />
          </div>
        </section>

        <section className="space-y-3">
          <div className="space-y-1">
            <h4 className="text-lg font-semibold text-foreground">Próximo atendimento</h4>
            <p className="text-sm text-muted-foreground">O que já está marcado para este cliente.</p>
          </div>

          {nextAppointment ? (
            <div className="rounded-[22px] border border-border bg-white px-4 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-medium text-foreground">{formatDateTime(nextAppointment.startAt)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {nextAppointment.service.name} com {nextAppointment.professional.name}
                  </p>
                </div>
                <StatusBadge status={nextAppointment.status} />
              </div>
            </div>
          ) : (
            <div className="rounded-[22px] border border-dashed border-border px-4 py-5">
              <p className="font-medium text-foreground">Sem atendimento marcado.</p>
              <p className="mt-1 text-sm text-muted-foreground">Quando houver um próximo horário, ele aparece aqui.</p>
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div className="space-y-1">
            <h4 className="text-lg font-semibold text-foreground">Histórico de atendimentos</h4>
            <p className="text-sm text-muted-foreground">Atendimentos mais recentes deste cliente.</p>
          </div>

          {client.appointments.length ? (
            <div className="overflow-hidden rounded-[24px] border border-border bg-white">
              {client.appointments.map((appointment, index) => (
                <div
                  key={appointment.id}
                  className={`px-4 py-4 sm:px-5 ${index !== client.appointments.length - 1 ? "border-b border-border" : ""}`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">{formatDateTime(appointment.startAt)}</p>
                      <p className="text-sm text-muted-foreground">
                        {appointment.service.name} com {appointment.professional.name}
                      </p>
                      <p className="text-sm text-muted-foreground">{formatMoney(appointment.priceInCents)}</p>
                    </div>
                    <StatusBadge status={appointment.status} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[22px] border border-dashed border-border px-4 py-5">
              <p className="font-medium text-foreground">Sem histórico ainda.</p>
              <p className="mt-1 text-sm text-muted-foreground">Os atendimentos deste cliente aparecerão aqui.</p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function ClientMetric({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="border-l border-border pl-4">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{helper}</p>
    </div>
  );
}
