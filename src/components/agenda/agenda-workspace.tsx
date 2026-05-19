"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { AppointmentStatus } from "@prisma/client";
import {
  addDays,
  addMonths,
  differenceInMinutes,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  CalendarPlus,
  CalendarX2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Scissors,
  Trash2,
  UserRound,
} from "lucide-react";
import { createBlockedTime, deleteBlockedTime, updateAppointmentStatus } from "@/server/actions/domain";
import { cn, formatDateTime } from "@/lib/utils";
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
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";

type AgendaAppointment = {
  id: string;
  startAt: Date;
  endAt: Date;
  status: AppointmentStatus;
  notes: string | null;
  cancellationReason?: string | null;
  client: { name: string };
  professional: { id: string; name: string };
  service: { name: string };
};

type AgendaProfessional = {
  id: string;
  name: string;
};

type AgendaBlockedTime = {
  id: string;
  startAt: Date;
  endAt: Date;
  reason: string | null;
  professionalId: string | null;
  professional: { id: string; name: string } | null;
};

const HALF_HOUR = 30;
const BASE_START_HOUR = 8;
const BASE_END_HOUR = 20;
const SLOT_HEIGHT = 54;
const TIMELINE_TOP_OFFSET = 16;

function buildTimeSlots(startHour: number, endHour: number) {
  const slots: string[] = [];

  for (let hour = startHour; hour < endHour; hour += 1) {
    slots.push(`${String(hour).padStart(2, "0")}:00`);
    slots.push(`${String(hour).padStart(2, "0")}:30`);
  }

  return slots;
}

function getStatusActions(status: AppointmentStatus) {
  if (status === AppointmentStatus.PENDING) {
    return [
      { label: "Confirmar", status: AppointmentStatus.CONFIRMED },
      { label: "Cancelar", status: AppointmentStatus.CANCELED },
    ];
  }

  if (status === AppointmentStatus.CONFIRMED) {
    return [
      { label: "Concluir", status: AppointmentStatus.COMPLETED },
      { label: "Cancelar", status: AppointmentStatus.CANCELED },
      { label: "Marcar ausência", status: AppointmentStatus.NO_SHOW },
    ];
  }

  return [];
}

function getStatusSummary(status: AppointmentStatus) {
  if (status === AppointmentStatus.PENDING) return "Pendente de confirmação";
  if (status === AppointmentStatus.CONFIRMED) return "Confirmado";
  if (status === AppointmentStatus.COMPLETED) return "Concluído";
  if (status === AppointmentStatus.CANCELED) return "Cancelado";
  return "Não compareceu";
}

function getDayIndicatorCount(appointments: AgendaAppointment[], day: Date) {
  return appointments.filter((item) => isSameDay(item.startAt, day)).length;
}

export function AgendaWorkspace({
  appointments,
  professionals,
  blockedTimes,
}: {
  appointments: AgendaAppointment[];
  professionals: AgendaProfessional[];
  blockedTimes: AgendaBlockedTime[];
}) {
  const today = startOfDay(new Date());
  const router = useRouter();
  const [agendaAppointments, setAgendaAppointments] = useState(appointments);
  const [agendaBlockedTimes, setAgendaBlockedTimes] = useState(blockedTimes);
  const [selectedDate, setSelectedDate] = useState(today);
  const [monthDate, setMonthDate] = useState(startOfMonth(today));
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>("all");
  const [selectedAppointment, setSelectedAppointment] = useState<AgendaAppointment | null>(null);
  const [pendingCompletion, setPendingCompletion] = useState<{ id: string } | null>(null);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [blockForm, setBlockForm] = useState({
    professionalId: "all",
    date: format(today, "yyyy-MM-dd"),
    startTime: "09:00",
    endTime: "10:00",
    reason: "",
  });
  const [isPending, startTransition] = useTransition();
  const [isBlocking, startBlockingTransition] = useTransition();

  useEffect(() => {
    setAgendaAppointments(appointments);
  }, [appointments]);

  useEffect(() => {
    setAgendaBlockedTimes(blockedTimes);
  }, [blockedTimes]);

  function selectDay(day: Date) {
    const normalizedDay = startOfDay(day);
    setSelectedDate(normalizedDay);
    setMonthDate(startOfMonth(normalizedDay));
  }

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(monthDate), { locale: ptBR });
    const end = endOfWeek(endOfMonth(monthDate), { locale: ptBR });
    return eachDayOfInterval({ start, end });
  }, [monthDate]);

  const visibleProfessionals = useMemo(() => {
    return selectedProfessionalId === "all"
      ? professionals
      : professionals.filter((professional) => professional.id === selectedProfessionalId);
  }, [professionals, selectedProfessionalId]);

  const dayAppointments = useMemo(() => {
    return agendaAppointments
      .filter((item) => isSameDay(item.startAt, selectedDate))
      .filter((item) => selectedProfessionalId === "all" || item.professional.id === selectedProfessionalId)
      .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  }, [agendaAppointments, selectedDate, selectedProfessionalId]);

  const selectedDayBlockedTimes = useMemo(() => {
    return agendaBlockedTimes
      .filter((item) => isSameDay(item.startAt, selectedDate))
      .filter((item) => selectedProfessionalId === "all" || item.professionalId === null || item.professionalId === selectedProfessionalId)
      .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  }, [agendaBlockedTimes, selectedDate, selectedProfessionalId]);

  const timelineBounds = useMemo(() => {
    if (!dayAppointments.length) {
      return { startHour: BASE_START_HOUR, endHour: BASE_END_HOUR };
    }

    const earliestHour = Math.min(...dayAppointments.map((item) => item.startAt.getHours()));
    const latestHour = Math.max(...dayAppointments.map((item) => item.endAt.getHours() + (item.endAt.getMinutes() > 0 ? 1 : 0)));

    return {
      startHour: Math.min(BASE_START_HOUR, Math.max(6, earliestHour - 1)),
      endHour: Math.max(BASE_END_HOUR, latestHour + 1),
    };
  }, [dayAppointments]);

  const timeSlots = useMemo(() => buildTimeSlots(timelineBounds.startHour, timelineBounds.endHour), [timelineBounds]);
  const totalMinutes = (timelineBounds.endHour - timelineBounds.startHour) * 60;
  const timelineHeight = (totalMinutes / HALF_HOUR) * SLOT_HEIGHT;
  const timelineCanvasHeight = timelineHeight + TIMELINE_TOP_OFFSET;

  async function applyStatusChange(id: string, status: AppointmentStatus) {
    await updateAppointmentStatus(id, status);
    setAgendaAppointments((current) =>
      current.map((item) =>
        item.id === id ? { ...item, status } : item
      )
    );
    setSelectedAppointment((current) =>
      current && current.id === id ? { ...current, status } : current
    );
  }

  function openBlockDialog() {
    setBlockForm({
      professionalId: selectedProfessionalId === "all" ? "all" : selectedProfessionalId,
      date: format(selectedDate, "yyyy-MM-dd"),
      startTime: "09:00",
      endTime: "10:00",
      reason: "",
    });
    setBlockDialogOpen(true);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-border bg-white/75 p-4 shadow-soft backdrop-blur md:p-5">
        <div className="flex flex-col gap-2.5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-brand-700">
              <CalendarDays className="h-4 w-4" />
              {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </div>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              {dayAppointments.length} agendamento{dayAppointments.length === 1 ? "" : "s"} no dia selecionado.
            </p>
          </div>
          <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap xl:items-center xl:justify-end">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-xl border border-border bg-white text-brand-700 hover:bg-muted"
                onClick={() => selectDay(addDays(selectedDate, -1))}
                aria-label="Dia anterior"
              >
                <ChevronLeft className="h-4 w-4 shrink-0 text-brand-700 stroke-[2.5]" />
              </Button>
              <Button type="button" variant="ghost" className="h-9 rounded-xl px-4 text-sm" onClick={() => selectDay(today)}>
                Hoje
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-xl border border-border bg-white text-brand-700 hover:bg-muted"
                onClick={() => selectDay(addDays(selectedDate, 1))}
                aria-label="Próximo dia"
              >
                <ChevronRight className="h-4 w-4 shrink-0 text-brand-700 stroke-[2.5]" />
              </Button>
            </div>
            <Select value={selectedProfessionalId} onValueChange={setSelectedProfessionalId}>
              <SelectTrigger className="min-w-[220px] rounded-full">
                <SelectValue placeholder="Todos os profissionais" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os profissionais</SelectItem>
                {professionals.map((professional) => (
                  <SelectItem key={professional.id} value={professional.id}>
                    {professional.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" className="rounded-full" onClick={openBlockDialog}>
              <CalendarX2 className="h-4 w-4" />
              Bloquear horário
            </Button>
            <Button asChild className="rounded-full">
              <Link href="/app/agendamentos?novo=1">
                <CalendarPlus className="h-4 w-4" />
                Novo agendamento
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <section className="rounded-[1.75rem] border border-border bg-white/80 p-4 shadow-soft md:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Calendário do mês</p>
              <p className="text-xs text-muted-foreground">Toque em um dia para abrir a agenda.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-xl border border-border bg-white text-brand-700 hover:bg-muted"
                onClick={() => setMonthDate(subMonths(monthDate, 1))}
                aria-label="Mês anterior"
              >
                <ChevronLeft className="h-4 w-4 shrink-0 text-brand-700 stroke-[2.5]" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-xl border border-border bg-white text-brand-700 hover:bg-muted"
                onClick={() => setMonthDate(addMonths(monthDate, 1))}
                aria-label="Próximo mês"
              >
                <ChevronRight className="h-4 w-4 shrink-0 text-brand-700 stroke-[2.5]" />
              </Button>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <h2 className="font-heading text-2xl font-semibold text-brand-800">
              {format(monthDate, "MMMM yyyy", { locale: ptBR })}
            </h2>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-block h-2 w-2 rounded-full bg-brand-500" />
              dia com agendamento
            </div>
          </div>

          <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((label) => (
              <div key={label} className="py-2">
                {label}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {monthDays.map((day) => {
              const indicatorCount = getDayIndicatorCount(agendaAppointments, day);
              const selected = isSameDay(day, selectedDate);
              const inMonth = isSameMonth(day, monthDate);

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => selectDay(day)}
                  className={cn(
                    "flex min-h-12 flex-col items-center justify-center rounded-2xl px-1 py-1.5 text-sm transition-colors sm:min-h-14 sm:py-2",
                    inMonth ? "text-foreground" : "text-muted-foreground/45",
                    selected && "bg-brand-600 text-white shadow-sm",
                    !selected && isToday(day) && "bg-brand-50 text-brand-700",
                    !selected && inMonth && "hover:bg-muted"
                  )}
                >
                  <span className="font-medium">{format(day, "d")}</span>
                  <span className="mt-1 flex min-h-4 items-center justify-center gap-1 text-[10px] font-medium">
                    {indicatorCount > 0 ? (
                      <>
                        <span className={cn("h-1.5 w-1.5 rounded-full", selected ? "bg-white/90" : "bg-brand-500")} />
                        <span className={cn(selected ? "text-white/90" : "text-brand-700")}>{indicatorCount}</span>
                      </>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>

          <Separator className="my-4 sm:my-5" />

          <div className="space-y-3 xl:hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Agenda do dia</p>
                <p className="text-xs text-muted-foreground">{format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}</p>
              </div>
            </div>
            {dayAppointments.length ? (
              <div className="space-y-2">
                {dayAppointments.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedAppointment(item)}
                    className="grid w-full gap-2 rounded-2xl border border-border bg-background px-4 py-3 text-left"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-brand-700">
                        {format(item.startAt, "HH:mm")} - {format(item.endAt, "HH:mm")}
                      </p>
                      <StatusBadge status={item.status} />
                    </div>
                    <div>
                      <p className="font-medium">{item.client.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.service.name} com {item.professional.name}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState
                title="Dia livre"
                description="Nenhum agendamento encontrado para o dia selecionado."
                className="min-h-44 bg-muted/30"
              />
            )}
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Bloqueios do dia</p>
                <p className="text-xs text-muted-foreground">Ajustes de indisponibilidade para a data selecionada.</p>
              </div>
              <Button type="button" variant="ghost" className="h-8 rounded-full px-3 text-sm" onClick={openBlockDialog}>
                Bloquear
              </Button>
            </div>

            {selectedDayBlockedTimes.length ? (
              <div className="space-y-2">
                {selectedDayBlockedTimes.map((blockedTime) => (
                  <div
                    key={blockedTime.id}
                    className="flex items-start justify-between gap-3 rounded-2xl border border-dashed border-border px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {format(blockedTime.startAt, "HH:mm")} - {format(blockedTime.endAt, "HH:mm")}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {blockedTime.professional?.name ?? "Toda a equipe"}
                      </p>
                      {blockedTime.reason ? (
                        <p className="mt-1 text-sm text-muted-foreground">{blockedTime.reason}</p>
                      ) : null}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0 rounded-full"
                      onClick={() => {
                        startBlockingTransition(async () => {
                          const result = await deleteBlockedTime(blockedTime.id);
                          if (!result.success) {
                            toast.error(result.message);
                            return;
                          }

                          setAgendaBlockedTimes((current) => current.filter((item) => item.id !== blockedTime.id));
                          router.refresh();
                          toast.success(result.message);
                        });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum bloqueio para este dia.</p>
            )}
          </div>
        </section>

        <section className="hidden rounded-[1.75rem] border border-border bg-white/80 shadow-soft xl:block">
          <div className="grid grid-cols-[88px_repeat(var(--columns),minmax(0,1fr))] border-b border-border" style={{ ["--columns" as string]: String(Math.max(visibleProfessionals.length, 1)) }}>
            <div className="px-4 py-4 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Hora</div>
            {visibleProfessionals.map((professional) => (
              <div key={professional.id} className="border-l border-border px-4 py-4">
                <p className="font-medium text-foreground">{professional.name}</p>
                <p className="text-xs text-muted-foreground">
                  {dayAppointments.filter((item) => item.professional.id === professional.id).length} agendamentos
                </p>
              </div>
            ))}
          </div>

          {visibleProfessionals.length ? (
            <div className="overflow-x-auto">
              <div className="grid grid-cols-[88px_repeat(var(--columns),minmax(220px,1fr))]" style={{ ["--columns" as string]: String(visibleProfessionals.length) }}>
                <div className="relative border-r border-border bg-[#fffaf9]">
                  {timeSlots.map((slot, index) => (
                    <div
                      key={slot}
                      className="absolute inset-x-0 border-b border-dashed border-border/80 px-4 text-xs text-muted-foreground"
                      style={{ top: TIMELINE_TOP_OFFSET + index * SLOT_HEIGHT, height: SLOT_HEIGHT }}
                    >
                      <span className="inline-block bg-[#fffaf9] pr-2 pt-1">{slot}</span>
                    </div>
                  ))}
                  <div style={{ height: timelineCanvasHeight }} />
                </div>

                {visibleProfessionals.map((professional) => {
                  const professionalAppointments = dayAppointments.filter((item) => item.professional.id === professional.id);

                  return (
                    <div key={professional.id} className="relative border-r border-border last:border-r-0">
                      {timeSlots.map((slot, index) => (
                        <div
                          key={slot}
                          className={cn(
                            "absolute inset-x-0 border-b border-border/70",
                            index % 2 === 0 ? "bg-white" : "bg-[#fffdfc]"
                          )}
                          style={{ top: TIMELINE_TOP_OFFSET + index * SLOT_HEIGHT, height: SLOT_HEIGHT }}
                        />
                      ))}

                      {professionalAppointments.map((appointment) => {
                        const startMinutes =
                          (appointment.startAt.getHours() - timelineBounds.startHour) * 60 + appointment.startAt.getMinutes();
                        const duration = differenceInMinutes(appointment.endAt, appointment.startAt);
                        const top = TIMELINE_TOP_OFFSET + (startMinutes / HALF_HOUR) * SLOT_HEIGHT;
                        const height = Math.max((duration / HALF_HOUR) * SLOT_HEIGHT - 8, 42);

                        return (
                          <button
                            key={appointment.id}
                            type="button"
                            onClick={() => setSelectedAppointment(appointment)}
                            className={cn(
                              "absolute left-3 right-3 overflow-hidden rounded-2xl border px-3 py-3 text-left shadow-sm transition-transform hover:-translate-y-0.5",
                              appointment.status === AppointmentStatus.CONFIRMED && "border-brand-200 bg-brand-50/95",
                              appointment.status === AppointmentStatus.PENDING && "border-amber-200 bg-amber-50/95",
                              appointment.status === AppointmentStatus.COMPLETED && "border-emerald-200 bg-emerald-50/95",
                              appointment.status === AppointmentStatus.CANCELED && "border-rose-200 bg-rose-50/95",
                              appointment.status === AppointmentStatus.NO_SHOW && "border-slate-200 bg-slate-100/95"
                            )}
                            style={{ top, height }}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-foreground">
                                  {format(appointment.startAt, "HH:mm")} - {format(appointment.endAt, "HH:mm")}{" "}
                                  <span className="text-muted-foreground">-</span> {appointment.client.name}
                                </p>
                                <p className="mt-1 truncate text-xs text-muted-foreground">
                                  {appointment.service.name} <span className="text-muted-foreground">-</span>{" "}
                                  {getStatusSummary(appointment.status)}
                                </p>
                              </div>
                              <span
                                className={cn(
                                  "mt-1 h-2.5 w-2.5 shrink-0 rounded-full",
                                  appointment.status === AppointmentStatus.CONFIRMED && "bg-brand-500",
                                  appointment.status === AppointmentStatus.PENDING && "bg-amber-500",
                                  appointment.status === AppointmentStatus.COMPLETED && "bg-emerald-500",
                                  appointment.status === AppointmentStatus.CANCELED && "bg-rose-500",
                                  appointment.status === AppointmentStatus.NO_SHOW && "bg-slate-500"
                                )}
                              />
                            </div>
                          </button>
                        );
                      })}
                      <div style={{ height: timelineCanvasHeight }} />
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-6">
              <EmptyState title="Nenhum profissional ativo" description="Ative ao menos um profissional para usar a grade diária da agenda." />
            </div>
          )}
        </section>
      </div>

      <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bloquear horário</DialogTitle>
            <DialogDescription>
              Defina uma indisponibilidade para um profissional ou para toda a equipe.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="blocked-professional">Profissional</Label>
              <Select
                value={blockForm.professionalId}
                onValueChange={(value) => setBlockForm((current) => ({ ...current, professionalId: value }))}
              >
                <SelectTrigger id="blocked-professional" className="rounded-xl">
                  <SelectValue placeholder="Toda a equipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toda a equipe</SelectItem>
                  {professionals.map((professional) => (
                    <SelectItem key={professional.id} value={professional.id}>
                      {professional.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2 sm:col-span-1">
                <Label htmlFor="blocked-date">Data</Label>
                <Input
                  id="blocked-date"
                  type="date"
                  value={blockForm.date}
                  onChange={(event) => setBlockForm((current) => ({ ...current, date: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="blocked-start">Início</Label>
                <Input
                  id="blocked-start"
                  type="time"
                  value={blockForm.startTime}
                  onChange={(event) => setBlockForm((current) => ({ ...current, startTime: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="blocked-end">Fim</Label>
                <Input
                  id="blocked-end"
                  type="time"
                  value={blockForm.endTime}
                  onChange={(event) => setBlockForm((current) => ({ ...current, endTime: event.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="blocked-reason">Motivo</Label>
              <Textarea
                id="blocked-reason"
                rows={3}
                placeholder="Ex.: pausa, reunião, atendimento externo"
                value={blockForm.reason}
                onChange={(event) => setBlockForm((current) => ({ ...current, reason: event.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setBlockDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={isBlocking}
              onClick={() => {
                startBlockingTransition(async () => {
                  const result = await createBlockedTime({
                    professionalId: blockForm.professionalId === "all" ? "" : blockForm.professionalId,
                    date: blockForm.date,
                    startTime: blockForm.startTime,
                    endTime: blockForm.endTime,
                    reason: blockForm.reason,
                  });

                  if (!result.success) {
                    toast.error(result.message);
                    return;
                  }

                  const professional =
                    blockForm.professionalId === "all"
                      ? null
                      : professionals.find((item) => item.id === blockForm.professionalId) ?? null;
                  const startAt = new Date(`${blockForm.date}T${blockForm.startTime}:00`);
                  const endAt = new Date(`${blockForm.date}T${blockForm.endTime}:00`);

                  setAgendaBlockedTimes((current) => [
                    ...current,
                    {
                      id: `${startAt.toISOString()}-${blockForm.professionalId}`,
                      startAt,
                      endAt,
                      reason: blockForm.reason.trim() || null,
                      professionalId: professional?.id ?? null,
                      professional,
                    },
                  ].sort((a, b) => a.startAt.getTime() - b.startAt.getTime()));

                  setSelectedDate(startOfDay(startAt));
                  setMonthDate(startOfMonth(startAt));
                  setBlockDialogOpen(false);
                  router.refresh();
                  toast.success(result.message);
                });
              }}
            >
              Salvar bloqueio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={Boolean(selectedAppointment)} onOpenChange={(open) => !open && setSelectedAppointment(null)}>
        <SheetContent side="right" className="overflow-y-auto sm:max-w-xl">
          {selectedAppointment ? (
            <>
              <SheetHeader>
                <SheetTitle className="pr-8">Detalhes do agendamento</SheetTitle>
                <SheetDescription>
                  Informações rápidas para recepção, gestão e acompanhamento do atendimento.
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-5">
                <div className="rounded-2xl bg-muted/40 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Cliente</p>
                      <p className="text-lg font-semibold">{selectedAppointment.client.name}</p>
                    </div>
                    <StatusBadge status={selectedAppointment.status} />
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{formatDateTime(selectedAppointment.startAt)} até {format(selectedAppointment.endAt, "HH:mm")}</p>
                </div>

                <div className="grid gap-3">
                  <div className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3">
                    <Scissors className="h-4 w-4 text-brand-700" />
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Serviço</p>
                      <p className="font-medium">{selectedAppointment.service.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3">
                    <UserRound className="h-4 w-4 text-brand-700" />
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Profissional</p>
                      <p className="font-medium">{selectedAppointment.professional.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3">
                    <Clock3 className="h-4 w-4 text-brand-700" />
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Período</p>
                      <p className="font-medium">
                        {format(selectedAppointment.startAt, "HH:mm")} - {format(selectedAppointment.endAt, "HH:mm")}
                      </p>
                    </div>
                  </div>
                </div>

                {selectedAppointment.notes ? (
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Observações</p>
                    <p className="mt-2 rounded-2xl border border-border px-4 py-3 text-sm text-foreground">
                      {selectedAppointment.notes}
                    </p>
                  </div>
                ) : null}

                {selectedAppointment.cancellationReason ? (
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Motivo do cancelamento</p>
                    <p className="mt-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      {selectedAppointment.cancellationReason}
                    </p>
                  </div>
                ) : null}

                {getStatusActions(selectedAppointment.status).length ? (
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Ações rápidas</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {getStatusActions(selectedAppointment.status).map((action) => (
                        <Button
                          key={action.status}
                          type="button"
                          variant={action.status === AppointmentStatus.CANCELED ? "outline" : "default"}
                          disabled={isPending}
                          onClick={() => {
                            if (action.status === AppointmentStatus.COMPLETED) {
                              setPendingCompletion({ id: selectedAppointment.id });
                              return;
                            }

                            startTransition(() => applyStatusChange(selectedAppointment.id, action.status));
                          }}
                        >
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="rounded-2xl border border-dashed border-border px-4 py-4 text-sm text-muted-foreground">
                  Se precisar editar horário, cliente ou serviço, use a gestão completa em <Link href="/app/agendamentos" className="font-medium text-primary underline underline-offset-4">Agendamentos</Link>.
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

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
                startTransition(() => applyStatusChange(pendingCompletion.id, AppointmentStatus.COMPLETED));
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
