import Link from "next/link";
import { cn } from "@/lib/utils";
import { navigationItems } from "@/components/layout/navigation-items";

export function Sidebar({ pathname }: { pathname: string }) {
  return (
    <aside className="hidden w-72 shrink-0 border-r border-border bg-[#fffaf9] px-5 py-6 lg:flex lg:flex-col">
      <div className="mb-8">
        <p className="font-heading text-3xl font-semibold text-brand-800">BellaPro</p>
        <p className="mt-2 text-sm text-muted-foreground">Gestão e agendamento para salões de beleza.</p>
      </div>
      <nav className="space-y-1">
        {navigationItems.map((item) => {
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
    </aside>
  );
}
