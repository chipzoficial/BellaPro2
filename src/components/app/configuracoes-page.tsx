"use client";

import { useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { organizationSchema } from "@/lib/validations/entities";
import { updateOrganization } from "@/server/actions/domain";
import { absoluteAppUrl } from "@/lib/utils";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

export function ConfiguracoesPage({
  organization,
}: {
  organization: {
    name: string;
    slug: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
  };
}) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<any>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: organization.name,
      slug: organization.slug,
      phone: organization.phone ?? "",
      email: organization.email ?? "",
      address: organization.address ?? "",
      city: organization.city ?? "",
      state: organization.state ?? "",
    },
  });

  function onSubmit(values: any) {
    startTransition(async () => {
      const result = await updateOrganization(values);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    });
  }

  const publicUrl = absoluteAppUrl(`/${organization.slug}`);

  return (
    <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-3xl border border-border bg-white p-6">
        <h3 className="text-lg font-semibold">Dados do salão</h3>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => <FormItem><FormLabel>Nome</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
            <FormField control={form.control} name="slug" render={({ field }) => <FormItem><FormLabel>Slug público</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
            <div className="grid gap-4 md:grid-cols-2">
              <FormField control={form.control} name="phone" render={({ field }) => <FormItem><FormLabel>Telefone</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>} />
              <FormField control={form.control} name="email" render={({ field }) => <FormItem><FormLabel>E-mail</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>} />
              <FormField control={form.control} name="city" render={({ field }) => <FormItem><FormLabel>Cidade</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>} />
              <FormField control={form.control} name="state" render={({ field }) => <FormItem><FormLabel>Estado</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>} />
            </div>
            <FormField control={form.control} name="address" render={({ field }) => <FormItem><FormLabel>Endereço</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>} />
            <Button type="submit" disabled={isPending}>Salvar configurações</Button>
          </form>
        </Form>
      </section>
      <section className="rounded-3xl border border-border bg-white p-6">
        <h3 className="text-lg font-semibold">Link público de agendamento</h3>
        <p className="mt-2 text-sm text-muted-foreground">Compartilhe este link com seus clientes para receber agendamentos diretos.</p>
        <div className="mt-6 rounded-2xl bg-muted p-4">
          <p className="text-sm font-medium break-all">{publicUrl}</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => navigator.clipboard.writeText(publicUrl)}>
            Copiar link
          </Button>
          <Button type="button" asChild>
            <a href={publicUrl} target="_blank" rel="noreferrer">Abrir página pública</a>
          </Button>
        </div>
      </section>
    </div>
  );
}
