import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export function AppShell({
  pathname,
  salonName,
  userName,
  children,
}: {
  pathname: string;
  salonName: string;
  userName: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f7f2f1] text-foreground">
      <div className="flex min-h-screen">
        <Sidebar pathname={pathname} />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <Topbar salonName={salonName} userName={userName} />
          <main className="flex-1 px-4 py-6 md:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
