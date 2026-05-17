import { cn } from "@/lib/utils";

export function FilterBar({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("flex flex-col gap-3 rounded-2xl border border-border bg-background/80 p-4 md:flex-row md:items-center", className)}>{children}</div>;
}
