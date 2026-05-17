import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  className,
  action,
}: {
  title: string;
  description: string;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={cn("flex min-h-60 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/40 px-6 py-10 text-center", className)}>
      <div className="mb-4 rounded-full bg-brand-100 p-3 text-brand-700">
        <Sparkles className="h-5 w-5" />
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
