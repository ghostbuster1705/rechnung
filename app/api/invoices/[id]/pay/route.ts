import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";

export async function POST(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await requireAuth();

    const invoice = await prisma.invoice.findFirst({
      where: {
        id: params.id,
        orgId: session.user.organizationId,
      },
      select: { id: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Rechnung nicht gefunden." }, { status: 404 });
    }

    await prisma.invoice.update({
      where: { id: params.id },
      data: {
        status: "PAID",
        paidAt: new Date(),
        isLocked: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        orgId: session.user.organizationId,
        userId: session.user.id,
        entity: "Invoice",
        entityId: params.id,
        action: "MARKED_PAID",
      },
    });

    return NextResponse.json({ message: "Rechnung als bezahlt markiert." });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
    }

    return NextResponse.json({ error: "Status konnte nicht geändert werden." }, { status: 500 });
  }
}
