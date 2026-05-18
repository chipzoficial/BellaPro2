import { AuthTokenType } from "@prisma/client";
import { randomBytes, createHash } from "node:crypto";
import { addHours } from "date-fns";
import { db } from "@/lib/db";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createAuthToken(options: {
  userId: string;
  type: AuthTokenType;
  expiresInHours: number;
}) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);

  await db.authToken.create({
    data: {
      userId: options.userId,
      type: options.type,
      tokenHash,
      expiresAt: addHours(new Date(), options.expiresInHours),
    },
  });

  return token;
}

export async function consumeAuthToken(options: {
  type: AuthTokenType;
  token: string;
}) {
  const tokenHash = hashToken(options.token);

  const authToken = await db.authToken.findFirst({
    where: {
      type: options.type,
      tokenHash,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: {
      user: true,
    },
  });

  if (!authToken) {
    return null;
  }

  await db.authToken.update({
    where: { id: authToken.id },
    data: { consumedAt: new Date() },
  });

  return authToken;
}

export async function revokeAuthTokens(options: {
  userId: string;
  type: AuthTokenType;
}) {
  await db.authToken.updateMany({
    where: {
      userId: options.userId,
      type: options.type,
      consumedAt: null,
    },
    data: {
      consumedAt: new Date(),
    },
  });
}
