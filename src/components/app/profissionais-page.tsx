"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { professionalSchema } from "@/lib/validations/entities";
import { toggleProfessionalStatus, upsertProfessional } from "@/server/actions/domain";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { toast } from "@/components/ui/use-toast";

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
  }>;
  services: Array<{ id: string; name: string }>;
}) {
  const [isPending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
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

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          type="button"
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
            <div key={professional.id} className="rounded-2xl border border-border bg-white p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="font-semibold">{professional.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{professional.email || professional.phone || "Sem contato informado"}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{professional.bio || "Sem bio cadastrada."}</p>
                  <p className="mt-3 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    {professional.professionalServices.map((item) => item.service.name).join(" • ") || "Sem serviços vinculados"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => edit(professional)}>Editar</Button>
                  <Button type="button" variant="ghost" onClick={() => startTransition(async () => {
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
            <DialogDescription>Use um modal dedicado para o cadastro, mantendo a listagem limpa.</DialogDescription>
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
    </div>
  );
}
