import { headers } from "next/headers";

export async function getRequestOrigin() {
  const requestHeaders = await headers();
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";

  return `${protocol}://${host}`;
}

export function getRequestOriginFromRequest(request: Request) {
  const origin = request.headers.get("origin");

  if (origin) {
    return origin;
  }

  const protocol = request.headers.get("x-forwarded-proto") ?? "http";
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "localhost:3000";

  return `${protocol}://${host}`;
}
