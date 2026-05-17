"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { registerAction } from "@/server/actions/auth";
import { registerSchema, type RegisterInput } from "@/lib/validations/auth";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

export function RegisterForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      salonName: "",
      slug: "",
      salonPhone: "",
      city: "",
      state: "",
      address: "",
    },
  });

  function onSubmit(values: RegisterInput) {
    startTransition(async () => {
      const result = await registerAction(values);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      router.push(result.message);
      router.refresh();
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField control={form.control} name="name" render={({ field }) => <FormItem><FormLabel>Seu nome</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name="email" render={({ field }) => <FormItem><FormLabel>E-mail</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name="phone" render={({ field }) => <FormItem><FormLabel>Telefone</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name="password" render={({ field }) => <FormItem><FormLabel>Senha</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name="confirmPassword" render={({ field }) => <FormItem><FormLabel>Confirmar senha</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField control={form.control} name="salonName" render={({ field }) => <FormItem><FormLabel>Nome do salão</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name="slug" render={({ field }) => <FormItem><FormLabel>Slug público</FormLabel><FormControl><Input placeholder="studio-maria" {...field} /></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name="salonPhone" render={({ field }) => <FormItem><FormLabel>Telefone do salão</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name="city" render={({ field }) => <FormItem><FormLabel>Cidade</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name="state" render={({ field }) => <FormItem><FormLabel>Estado</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name="address" render={({ field }) => <FormItem className="md:col-span-2"><FormLabel>Endereço</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>} />
        </div>
        <Button type="submit" size="lg" disabled={isPending}>
          Criar conta e entrar
        </Button>
      </form>
    </Form>
  );
}
