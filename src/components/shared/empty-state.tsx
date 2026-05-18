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
    <div className={cn("flex min-h-44 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/40 px-5 py-8 text-center sm:min-h-60 sm:px-6 sm:py-10", className)}>
      <div className="mb-3 rounded-full bg-brand-100 p-2.5 text-brand-700 sm:mb-4 sm:p-3">
        <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
      </div>
      <h3 className="text-base font-semibold sm:text-lg">{title}</h3>
      <p className="mt-1.5 max-w-md text-xs text-muted-foreground sm:mt-2 sm:text-sm">{description}</p>
      {action ? <div className="mt-4 sm:mt-5">{action}</div> : null}
    </div>
  );
}
