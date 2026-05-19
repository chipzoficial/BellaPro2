"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const periodOptions = [
  { value: "month", label: "Este mês" },
  { value: "last_30_days", label: "Últimos 30 dias" },
  { value: "last_90_days", label: "Últimos 90 dias" },
  { value: "year", label: "Este ano" },
] as const;

export function FinancePeriodFilter({ value }: { value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function updatePeriod(nextValue: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (nextValue === "month") {
      params.delete("period");
    } else {
      params.set("period", nextValue);
    }

    const query = params.toString();

    startTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname);
    });
  }

  return (
    <div className="space-y-3">
      <div className="md:hidden">
        <Select value={value} onValueChange={updatePeriod} disabled={isPending}>
          <SelectTrigger className="rounded-full">
            <SelectValue placeholder="Selecione o período" />
          </SelectTrigger>
          <SelectContent>
            {periodOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="hidden flex-wrap gap-2 md:flex">
        {periodOptions.map((option) => (
          <Button
            key={option.value}
            type="button"
            variant={value === option.value ? "default" : "outline"}
            onClick={() => updatePeriod(option.value)}
            disabled={isPending}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
