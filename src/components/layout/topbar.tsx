import { LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/server/actions/auth";
import { MobileNav } from "@/components/layout/mobile-nav";

export function Topbar({
  salonName,
  userName,
}: {
  salonName: string;
  userName: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border bg-white/70 px-4 py-4 backdrop-blur md:px-6">
      <div className="flex items-center gap-3">
        <MobileNav />
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Salão atual</p>
          <p className="text-sm font-semibold text-foreground">{salonName}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden text-right md:block">
          <p className="text-sm font-medium">{userName}</p>
          <p className="text-xs text-muted-foreground">Conta autenticada</p>
        </div>
        <Avatar className="h-10 w-10">
          <AvatarFallback name={userName} />
        </Avatar>
        <form action={logoutAction}>
          <Button variant="outline" size="icon" aria-label="Sair">
            <LogOut className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
