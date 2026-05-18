import Image from "next/image";
import bellaproLogo from "@/app/bellapro-logo.png";
import { cn } from "@/lib/utils";

export function AppLogo({
  className,
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={bellaproLogo}
      alt="BellaPro"
      priority={priority}
      className={cn("h-auto w-[220px]", className)}
    />
  );
}
