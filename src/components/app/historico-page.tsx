"use client";

import { useMemo, useState, useTransition } from "react";
import { AppointmentStatus } from "@prisma/client";
import { formatDateTime } from "@/lib/utils";
import { updateAppointmentStatus } from "@/server/actions/domain";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";
import { getAppointmentClientName } from "@/lib/appointment-client";

const historyFilters = [
  { value: "all", label: "Todos" },
  { value: AppointmentStatus.COMPLETED, label: "Concluído" },
  { value: AppointmentStatus.CANCELED, label: "Cancelado" },
  { value: AppointmentStatus.NO_SHOW, label: "Não compareceu" },
] as const;

const statusOptions = [
  { value: AppointmentStatus.PENDING, label: "Pendente" },
  { value: AppointmentStatus.CONFIRMED, label: "Confirmado" },
  { value: AppointmentStatus.COMPLETED, label: "Concluído" },
  { value: AppointmentStatus.CANCELED, label: "Cancelado" },
  { value: AppointmentStatus.NO_SHOW, label: "Não compareceu" },
] as const;

const closedStatuses = [
  AppointmentStatus.COMPLETED,
  AppointmentStatus.CANCELED,
  AppointmentStatus.NO_SHOW,
] as const;

function getStatusLabel(status: AppointmentStatus) {
  return statusOptions.find((item) => item.value === status)?.label ?? status;
}

export function HistoricoPage({
  appointments,
}: {
  appointments: Array<any>;
}) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [draftStatuses, setDraftStatuses] = useState<Record<string, AppointmentStatus>>({});
  const [historyAppointments, setHistoryAppointments] = useState(appointments);
  const [pendingStatusSave, setPendingStatusSave] = useState<{ id: string; nextStatus: AppointmentStatus; clientName: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(
    () =>
      historyAppointments
        .filter((item) => closedStatuses.includes(item.status))
        .filter((item) => (statusFilter === "all" ? true : item.status === statusFilter)),
    [historyAppointments, statusFilter]
  );

  async function handleSaveStatus(appointmentId: string, nextStatus: AppointmentStatus) {
    const result = await updateAppointmentStatus(appointmentId, nextStatus);
    if (!result.success) {
      toast.error(result.message);
      return;
    }

    setHistoryAppointments((current) =>
      current.map((item) =>
        item.id === appointmentId ? { ...item, status: nextStatus } : item
      )
    );
    setDraftStatuses((current) => {
      const next = { ...current };
      delete next[appointmentId];
      return next;
    });
    toast.success(result.message);
  }

  return (
    <section className="space-y-4">
      <div className="space-y-3 md:hidden">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="rounded-full">
            <SelectValue placeholder="Filtrar status" />
          </SelectTrigger>
          <SelectContent>
            {historyFilters.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="hidden gap-2 overflow-auto md:flex">
        {historyFilters.map((status) => (
          <Button key={status.value} type="button" variant={statusFilter === status.value ? "default" : "outline"} onClick={() => setStatusFilter(status.value)}>
            {status.label}
          </Button>
        ))}
      </div>

      {!filtered.length ? (
        <EmptyState title="Sem atendimentos no histórico" description="Os atendimentos concluídos, cancelados e faltas aparecerão aqui." />
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {filtered.map((item) => {
              const selectedStatus = draftStatuses[item.id] ?? item.status;

              return (
                <div key={item.id} className="rounded-[1.5rem] border border-border bg-white px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-brand-800">{formatDateTime(item.startAt)}</p>
                      <p className="mt-2 font-medium text-foreground">{getAppointmentClientName(item)}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{item.service.name}</p>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                  <div className="mt-4 space-y-2">
                    <Select
                      value={selectedStatus}
                      onValueChange={(value) =>
                        setDraftStatuses((current) => ({
                          ...current,
                          [item.id]: value as AppointmentStatus,
                        }))
                      }
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      className="w-full"
                      disabled={isPending || selectedStatus === item.status}
                      onClick={() =>
                        setPendingStatusSave({
                          id: item.id,
                          nextStatus: selectedStatus,
                          clientName: getAppointmentClientName(item),
                        })
                      }
                    >
                      Salvar status
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quando</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Serviço</TableHead>
                  <TableHead>Status atual</TableHead>
                  <TableHead>Novo status</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => {
                  const selectedStatus = draftStatuses[item.id] ?? item.status;

                  return (
                    <TableRow key={item.id}>
                      <TableCell>{formatDateTime(item.startAt)}</TableCell>
                      <TableCell>{getAppointmentClientName(item)}</TableCell>
                      <TableCell>{item.service.name}</TableCell>
                      <TableCell><StatusBadge status={item.status} /></TableCell>
                      <TableCell className="w-[220px]">
                        <Select
                          value={selectedStatus}
                          onValueChange={(value) =>
                            setDraftStatuses((current) => ({
                              ...current,
                              [item.id]: value as AppointmentStatus,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {statusOptions.map((status) => (
                              <SelectItem key={status.value} value={status.value}>
                                {status.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="outline"
                          disabled={isPending || selectedStatus === item.status}
                          onClick={() =>
                            setPendingStatusSave({
                              id: item.id,
                              nextStatus: selectedStatus,
                              clientName: getAppointmentClientName(item),
                            })
                          }
                        >
                          Salvar status
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <AlertDialog open={Boolean(pendingStatusSave)} onOpenChange={(open) => !open && setPendingStatusSave(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterar status do atendimento</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingStatusSave
                ? `Deseja alterar o atendimento de ${pendingStatusSave.clientName} para ${getStatusLabel(pendingStatusSave.nextStatus).toLowerCase()}?`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!pendingStatusSave) return;
                startTransition(() => handleSaveStatus(pendingStatusSave.id, pendingStatusSave.nextStatus));
                setPendingStatusSave(null);
              }}
            >
              Salvar status
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
