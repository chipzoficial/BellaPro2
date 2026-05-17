import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get("bellapro_session")?.value);

  if (pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (pathname === "/register") {
    return NextResponse.redirect(new URL("/criar-conta", request.url));
  }

  if ((pathname.startsWith("/app") || pathname.startsWith("/admin") || pathname.startsWith("/selecionar-salao")) && !hasSession) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/register", "/app/:path*", "/admin/:path*", "/selecionar-salao"],
};
