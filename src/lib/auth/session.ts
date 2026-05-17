import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { db } from "@/lib/db";

const COOKIE_NAME = "bellapro_session";
const encoder = new TextEncoder();

type SessionPayload = {
  userId: string;
  activeOrganizationId?: string;
};

function getSecret() {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error("AUTH_SECRET não configurado.");
  }

  return encoder.encode(secret);
}

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function readSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const cookie = store.get(COOKIE_NAME)?.value;

  if (!cookie) return null;

  try {
    const { payload } = await jwtVerify(cookie, getSecret());
    return {
      userId: String(payload.userId),
      activeOrganizationId: payload.activeOrganizationId ? String(payload.activeOrganizationId) : undefined,
    };
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const session = await readSession();
  if (!session?.userId) return null;

  return db.user.findUnique({
    where: { id: session.userId },
    include: {
      memberships: {
        include: {
          organization: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/");
  }
  return user;
}

export async function setActiveOrganization(organizationId: string) {
  const session = await readSession();
  if (!session) {
    redirect("/");
  }
  await createSession({
    userId: session.userId,
    activeOrganizationId: organizationId,
  });
}

export async function getCurrentMembership(requiredRoles?: Role[]) {
  const user = await requireUser();
  const session = await readSession();

  let membership =
    user.memberships.find((item) => item.organizationId === session?.activeOrganizationId) ??
    user.memberships[0];

  if (!membership && user.memberships.length === 1) {
    membership = user.memberships[0];
  }

  if (!membership) {
    redirect("/selecionar-salao");
  }

  if (!session?.activeOrganizationId || session.activeOrganizationId !== membership.organizationId) {
    await setActiveOrganization(membership.organizationId);
  }

  if (requiredRoles && !requiredRoles.includes(membership.role)) {
    redirect("/app?erro=sem-permissao");
  }

  return membership;
}
