"use client";

import { useMemo, useState, useTransition } from "react";
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
import { formatDateTime } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";

export function AgendamentosPage({
  appointments,
  clients,
  professionals,
  services,
}: {
  appointments: Array<any>;
  clients: Array<{ id: string; name: string }>;
  professionals: Array<{ id: string; name: string }>;
  services: Array<{ id: string; name: string }>;
}) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
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

  const filtered = useMemo(
    () => appointments.filter((item) => (statusFilter === "all" ? true : item.status === statusFilter)),
    [appointments, statusFilter]
  );

  return (
    <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
      <section className="space-y-4">
        <div className="flex gap-2 overflow-auto">
          {["all", ...Object.values(AppointmentStatus)].map((status) => (
            <Button key={status} type="button" variant={statusFilter === status ? "default" : "outline"} onClick={() => setStatusFilter(status)}>
              {status === "all" ? "Todos" : status}
            </Button>
          ))}
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
                    <Button type="button" variant="ghost" onClick={() => form.reset({
                      id: item.id,
                      clientId: item.clientId,
                      professionalId: item.professionalId,
                      serviceId: item.serviceId,
                      startAt: new Date(item.startAt).toISOString().slice(0, 16),
                      status: item.status,
                      notes: item.notes ?? "",
                    })}>Editar</Button>
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
      <section className="rounded-3xl border border-border bg-white p-6">
        <h3 className="text-lg font-semibold">Novo agendamento</h3>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((values) => startTransition(async () => {
            const result = await upsertAppointment({
              ...values,
              startAt: new Date(values.startAt).toISOString(),
            });
            if (result.success) {
              toast.success(result.message);
            } else {
              toast.error(result.message);
            }
          }))} className="mt-6 space-y-4">
            <FormField control={form.control} name="clientId" render={({ field }) => <FormItem><FormLabel>Cliente</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{clients.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} />
            <FormField control={form.control} name="professionalId" render={({ field }) => <FormItem><FormLabel>Profissional</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{professionals.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} />
            <FormField control={form.control} name="serviceId" render={({ field }) => <FormItem><FormLabel>Serviço</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{services.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} />
            <FormField control={form.control} name="startAt" render={({ field }) => <FormItem><FormLabel>Data e hora</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl><FormMessage /></FormItem>} />
            <Button type="submit" disabled={isPending}>Salvar agendamento</Button>
          </form>
        </Form>
      </section>
    </div>
  );
}
