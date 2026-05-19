"use client";

import { useMemo, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { clientSchema } from "@/lib/validations/entities";
import { deleteClient, upsertClient } from "@/server/actions/domain";
import { SearchInput } from "@/components/shared/search-input";
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
  initialClients: Array<{ id: string; name: string; phone: string | null; email: string | null; notes: string | null }>;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
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
                    <div>
                      <p className="font-medium text-foreground">{client.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{client.phone || client.email || "Sem contato"}</p>
                    </div>
                    {client.notes ? (
                      <div className="rounded-[1.25rem] bg-[#fffaf9] px-3 py-3">
                        <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">Observações</p>
                        <p className="mt-2 text-sm text-foreground">{client.notes}</p>
                      </div>
                    ) : null}
                    <div className="flex gap-2">
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
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell>{client.phone || client.email || "—"}</TableCell>
                  <TableCell className="max-w-xs truncate">{client.notes || "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
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
    </div>
  );
}
