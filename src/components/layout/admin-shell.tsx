"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, Shield } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { AppLogo } from "@/components/brand/app-logo";
import { adminNavigationItems } from "@/components/layout/admin-navigation";
import { logoutAction } from "@/server/actions/auth";
import { cn } from "@/lib/utils";

function AdminSidebar({
  pathname,
}: {
  pathname: string;
}) {
  return (
    <aside className="sticky top-0 hidden h-screen w-72 shrink-0 border-r border-border bg-[#fffaf9] px-5 py-6 lg:flex lg:flex-col">
      <div className="mb-8">
        <AppLogo className="w-[170px]" />
        <p className="mt-2 text-sm text-muted-foreground">Painel administrativo da plataforma.</p>
      </div>
      <nav className="space-y-1">
        {adminNavigationItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-white hover:text-foreground",
                active && "bg-white text-foreground shadow-sm"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-border pt-5">
        <div className="flex items-start gap-3 rounded-[22px] bg-white/70 px-4 py-4">
          <Shield className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
          <div>
            <p className="text-sm font-medium text-foreground">Admin global</p>
            <p className="mt-1 text-xs text-muted-foreground">Acesso à operação do SaaS.</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function AdminMobileNav({
  pathname,
}: {
  pathname: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="lg:hidden">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="max-w-xs bg-[#fffaf9]">
        <div className="mb-6">
          <AppLogo className="w-[170px]" />
          <p className="mt-2 text-sm text-muted-foreground">Painel administrativo da plataforma.</p>
        </div>
        <div className="flex h-full flex-col">
          <nav className="space-y-1">
            {adminNavigationItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-white hover:text-foreground",
                    active && "bg-white text-foreground shadow-sm"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto border-t border-border pt-5">
            <div className="flex items-start gap-3 rounded-[22px] bg-white/70 px-4 py-4">
              <Shield className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
              <div>
                <p className="text-sm font-medium text-foreground">Admin global</p>
                <p className="mt-1 text-xs text-muted-foreground">Acesso à operação do SaaS.</p>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function AdminShell({
  userName,
  children,
}: {
  userName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#f7f2f1] text-foreground">
      <div className="flex min-h-screen">
        <AdminSidebar pathname={pathname} />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-border bg-white/70 px-4 py-4 backdrop-blur md:px-6">
            <div className="flex items-center gap-3">
              <AdminMobileNav pathname={pathname} />
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Painel do SaaS</p>
                <p className="text-sm font-semibold text-foreground">Administração BellaPro</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden text-right md:block">
                <p className="text-sm font-medium">{userName}</p>
                <p className="text-xs text-muted-foreground">Admin global</p>
              </div>
              <Avatar className="h-10 w-10">
                <AvatarFallback name={userName} />
              </Avatar>
              <form action={logoutAction}>
                <Button variant="outline" size="icon" aria-label="Sair">
                  <LogOut className="h-5 w-5" />
                </Button>
              </form>
            </div>
          </div>
          <main className="flex-1 px-4 py-6 md:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
