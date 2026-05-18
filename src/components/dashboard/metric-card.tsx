import { Card, CardContent } from "@/components/ui/card";

export function MetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <Card className="border-none bg-white/80 shadow-soft">
      <CardContent className="p-4 sm:p-5">
        <p className="text-xs text-muted-foreground sm:text-sm">{label}</p>
        <p className="mt-2 text-xl font-semibold text-foreground sm:mt-3 sm:text-2xl">{value}</p>
        {helper ? <p className="mt-1 text-[11px] text-muted-foreground sm:mt-2 sm:text-xs">{helper}</p> : null}
      </CardContent>
    </Card>
  );
}
