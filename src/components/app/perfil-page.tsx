"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { changePassword, updateProfile } from "@/server/actions/domain";
import { toast } from "@/components/ui/use-toast";

export function PerfilPage({
  user,
}: {
  user: { name: string; email: string; phone: string | null };
}) {
  const [isPending, startTransition] = useTransition();
  const profileForm = useForm({
    defaultValues: {
      name: user.name,
      phone: user.phone ?? "",
    },
  });
  const passwordForm = useForm({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  return (
    <div className="grid gap-8 xl:grid-cols-2">
      <section className="rounded-3xl border border-border bg-white p-6">
        <h3 className="text-lg font-semibold">Dados pessoais</h3>
        <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
        <Form {...profileForm}>
          <form onSubmit={profileForm.handleSubmit((values) => startTransition(async () => {
            const result = await updateProfile(values);
            if (result.success) {
              toast.success(result.message);
            } else {
              toast.error(result.message);
            }
          }))} className="mt-6 space-y-4">
            <FormField control={profileForm.control} name="name" render={({ field }) => <FormItem><FormLabel>Nome</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
            <FormField control={profileForm.control} name="phone" render={({ field }) => <FormItem><FormLabel>Telefone</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>} />
            <Button type="submit" disabled={isPending}>Salvar perfil</Button>
          </form>
        </Form>
      </section>
      <section className="rounded-3xl border border-border bg-white p-6">
        <h3 className="text-lg font-semibold">Alterar senha</h3>
        <Form {...passwordForm}>
          <form onSubmit={passwordForm.handleSubmit((values) => startTransition(async () => {
            const result = await changePassword(values);
            if (result.success) {
              toast.success(result.message);
            } else {
              toast.error(result.message);
            }
            if (result.success) passwordForm.reset();
          }))} className="mt-6 space-y-4">
            <FormField control={passwordForm.control} name="currentPassword" render={({ field }) => <FormItem><FormLabel>Senha atual</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>} />
            <FormField control={passwordForm.control} name="newPassword" render={({ field }) => <FormItem><FormLabel>Nova senha</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>} />
            <FormField control={passwordForm.control} name="confirmPassword" render={({ field }) => <FormItem><FormLabel>Confirmar nova senha</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>} />
            <Button type="submit" disabled={isPending}>Atualizar senha</Button>
          </form>
        </Form>
      </section>
    </div>
  );
}
