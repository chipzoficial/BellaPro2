import { formatMoney } from "@/lib/utils";

export function MoneyText({ valueInCents }: { valueInCents: number }) {
  return <span>{formatMoney(valueInCents)}</span>;
}
