"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { organizationSchema } from "@/lib/validations/entities";
import { normalizeSlug } from "@/lib/slug";
import { updateOrganization } from "@/server/actions/domain";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

export function ConfiguracoesPage({
  organization,
  publicBaseUrl,
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
  publicBaseUrl: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [slugTouchedManually, setSlugTouchedManually] = useState(false);
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
  const watchedName = form.watch("name");
  const watchedSlug = form.watch("slug");
  const previousNameRef = useRef(organization.name);

  useEffect(() => {
    if (slugTouchedManually) return;
    if (watchedName === previousNameRef.current) return;

    const nextSlug = normalizeSlug(watchedName ?? "");
    form.setValue("slug", nextSlug, {
      shouldDirty: true,
      shouldValidate: true,
    });
    previousNameRef.current = watchedName;
  }, [form, slugTouchedManually, watchedName]);

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

  const normalizedSlug = useMemo(() => normalizeSlug(watchedSlug || organization.slug), [organization.slug, watchedSlug]);
  const publicUrl = useMemo(() => new URL(`/${normalizedSlug}`, publicBaseUrl).toString(), [normalizedSlug, publicBaseUrl]);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-3xl border border-border bg-white p-5 sm:p-6">
        <h3 className="text-lg font-semibold">Dados do salão</h3>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-5 space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => <FormItem><FormLabel>Nome</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Endereço da sua página</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      onChange={(event) => {
                        setSlugTouchedManually(true);
                        field.onChange(normalizeSlug(event.target.value));
                      }}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">Você pode ajustar esse endereço quando quiser.</p>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <FormField control={form.control} name="phone" render={({ field }) => <FormItem><FormLabel>Telefone</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>} />
              <FormField control={form.control} name="email" render={({ field }) => <FormItem><FormLabel>E-mail</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>} />
            </div>
            <div className="grid gap-4 grid-cols-[minmax(0,1fr)_96px] sm:grid-cols-[minmax(0,1fr)_120px]">
              <FormField control={form.control} name="city" render={({ field }) => <FormItem><FormLabel>Cidade</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>} />
              <FormField control={form.control} name="state" render={({ field }) => <FormItem><FormLabel>Estado</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>} />
            </div>
            <FormField control={form.control} name="address" render={({ field }) => <FormItem><FormLabel>Endereço</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>} />
            <Button type="submit" className="w-full sm:w-auto" disabled={isPending}>Salvar configurações</Button>
          </form>
        </Form>
      </section>
      <section className="rounded-3xl border border-border bg-white p-5 sm:p-6">
        <h3 className="text-lg font-semibold">Página de agendamento</h3>
        <p className="mt-2 text-sm text-muted-foreground">Use esse link para receber agendamentos online.</p>
        <div className="mt-5 rounded-2xl bg-muted p-4">
          <p className="text-sm font-medium break-all">{publicUrl}</p>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Button type="button" variant="outline" className="w-full" onClick={() => navigator.clipboard.writeText(publicUrl)}>
            Copiar link
          </Button>
          <Button type="button" className="w-full" asChild>
            <a href={publicUrl} target="_blank" rel="noreferrer">Abrir página</a>
          </Button>
        </div>
      </section>
    </div>
  );
}
