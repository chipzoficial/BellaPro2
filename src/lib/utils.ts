import { clsx, type ClassValue } from "clsx";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(valueInCents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valueInCents / 100);
}

export function formatDateTime(value: Date | string, pattern = "dd/MM/yyyy 'às' HH:mm") {
  return format(new Date(value), pattern, { locale: ptBR });
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function absoluteAppUrl(path = "") {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  return new URL(path || "/", base).toString();
}
