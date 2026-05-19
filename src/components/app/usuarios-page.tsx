"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Role } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { organizationUserSchema } from "@/lib/validations/entities";
import { toggleOrganizationUserStatusAction, upsertOrganizationUserAction } from "@/server/actions/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";

const roleOptions = [
  { value: Role.MANAGER, label: "Gerente" },
  { value: Role.PROFESSIONAL, label: "Profissional" },
  { value: Role.RECEPTIONIST, label: "Recepção" },
] as const;

function getRoleLabel(role: Role) {
  const labels: Record<Role, string> = {
    ADMIN_GLOBAL: "Admin global",
    OWNER: "Owner",
    MANAGER: "Gerente",
    PROFESSIONAL: "Profissional",
    RECEPTIONIST: "Recepção",
    CLIENT: "Cliente",
  };

  return labels[role];
}

export function UsuariosPage({
  users,
}: {
  users: Array<{
    id: string;
    role: Role;
    userId: string;
    user: {
      id: string;
      name: string;
      email: string;
      phone: string | null;
      isActive: boolean;
    };
  }>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [selectedMembershipId, setSelectedMembershipId] = useState<string | null>(null);
  const form = useForm<any>({
    resolver: zodResolver(organizationUserSchema),
    defaultValues: {
      membershipId: "",
      userId: "",
      name: "",
      email: "",
      phone: "",
      role: Role.RECEPTIONIST,
      password: "",
      isActive: true,
    },
  });

  function openCreate() {
    setSelectedMembershipId(null);
    form.reset({
      membershipId: "",
      userId: "",
      name: "",
      email: "",
      phone: "",
      role: Role.RECEPTIONIST,
      password: "",
      isActive: true,
    });
    setOpen(true);
  }

  function openEdit(item: (typeof users)[number]) {
    setSelectedMembershipId(item.id);
    form.reset({
      membershipId: item.id,
      userId: item.user.id,
      name: item.user.name,
      email: item.user.email,
      phone: item.user.phone ?? "",
      role: item.role,
      password: "",
      isActive: item.user.isActive,
    });
    setOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" className="w-full md:w-auto" onClick={openCreate}>
          Novo usuário
        </Button>
      </div>

      {users.length ? (
        <>
          <div className="space-y-3 md:hidden">
            {users.map((item) => (
              <div key={item.id} className="rounded-[1.5rem] border border-border bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-foreground">{item.user.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{item.user.email}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{item.user.phone || "Sem telefone informado"}</p>
                  </div>
                  <Badge variant={item.user.isActive ? "success" : "secondary"}>
                    {item.user.isActive ? "Ativo" : "Inativo"}
                  </Badge>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <Badge variant="outline">{getRoleLabel(item.role)}</Badge>
                </div>

                <div className="mt-4 flex gap-2 border-t border-border pt-4">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => openEdit(item)}>
                    Editar
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="flex-1"
                    onClick={() =>
                      startTransition(async () => {
                        const result = await toggleOrganizationUserStatusAction(item.id);
                        if (!result.success) {
                          toast.error(result.message);
                          return;
                        }
                        toast.success(result.message);
                        router.refresh();
                      })
                    }
                  >
                    {item.user.isActive ? "Desativar" : "Ativar"}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden md:block rounded-3xl border border-border bg-white p-4 md:p-5">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">{item.user.name}</p>
                        <p className="text-sm text-muted-foreground">{item.user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{getRoleLabel(item.role)}</TableCell>
                    <TableCell>{item.user.phone || "Sem telefone informado"}</TableCell>
                    <TableCell>
                      <Badge variant={item.user.isActive ? "success" : "secondary"}>
                        {item.user.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={() => openEdit(item)}>
                          Editar
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() =>
                            startTransition(async () => {
                              const result = await toggleOrganizationUserStatusAction(item.id);
                              if (!result.success) {
                                toast.error(result.message);
                                return;
                              }
                              toast.success(result.message);
                              router.refresh();
                            })
                          }
                        >
                          {item.user.isActive ? "Desativar" : "Ativar"}
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
        <EmptyState title="Nenhum usuário da equipe" description="Crie acessos para gerência, recepção e profissionais do salão." />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedMembershipId ? "Editar usuário" : "Novo usuário"}</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((values) =>
                startTransition(async () => {
                  const result = await upsertOrganizationUserAction(values);
                  if (!result.success) {
                    toast.error(result.message);
                    return;
                  }
                  toast.success(result.message);
                  setOpen(false);
                  router.refresh();
                })
              )}
              className="space-y-4"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cargo</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {roleOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{selectedMembershipId ? "Nova senha" : "Senha inicial"}</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value === "active")}
                        value={field.value ? "active" : "inactive"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Ativo</SelectItem>
                          <SelectItem value="inactive">Inativo</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={isPending}>
                  Salvar usuário
                </Button>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
