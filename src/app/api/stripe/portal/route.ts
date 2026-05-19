import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentMembership } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getRequestOriginFromRequest } from "@/lib/request-origin";
import { getStripeClient } from "@/lib/stripe";

export async function POST(request: Request) {
  try {
    const stripe = getStripeClient();
    const membership = await getCurrentMembership([Role.OWNER]);
    const organization = await db.organization.findUnique({
      where: { id: membership.organizationId },
      select: {
        stripeCustomerId: true,
      },
    });

    if (!organization?.stripeCustomerId) {
      return NextResponse.json({ success: false, message: "Cliente Stripe ainda não criado." }, { status: 400 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: organization.stripeCustomerId,
      return_url: `${getRequestOriginFromRequest(request)}/app/assinatura`,
    });

    return NextResponse.json({ success: true, url: session.url });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Erro ao abrir portal da cobrança.",
      },
      { status: 500 }
    );
  }
}
