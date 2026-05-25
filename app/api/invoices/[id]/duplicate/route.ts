import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";
import { reserveInvoiceNumber } from "@/lib/invoice/numbering";

export async function POST(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await requireAuth();

    const source = await prisma.invoice.findFirst({
      where: {
        id: params.id,
        orgId: session.user.organizationId,
      },
    });

    if (!source) {
      return NextResponse.json({ error: "Rechnung nicht gefunden." }, { status: 404 });
    }

    const number = await reserveInvoiceNumber(session.user.organizationId);

    const duplicated = await prisma.invoice.create({
      data: {
        orgId: source.orgId,
        clientId: source.clientId,
        number,
        status: "DRAFT",
        issueDate: new Date(),
        deliveryDate: source.deliveryDate,
        dueDate: source.dueDate,
        paymentTerms: source.paymentTerms,
        reference: source.reference,
        lineItems: source.lineItems as Prisma.InputJsonValue,
        totals: source.totals as Prisma.InputJsonValue,
        notes: source.notes,
        buyerSnapshot: source.buyerSnapshot as Prisma.InputJsonValue,
        sellerSnapshot: source.sellerSnapshot as Prisma.InputJsonValue,
      },
    });

    await prisma.auditLog.create({
      data: {
        orgId: session.user.organizationId,
        userId: session.user.id,
        entity: "Invoice",
        entityId: duplicated.id,
        action: "DUPLICATED",
        payload: { sourceInvoiceId: source.id },
      },
    });

    return NextResponse.json({
      message: "Rechnung dupliziert.",
      invoiceId: duplicated.id,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
    }

    return NextResponse.json({ error: "Duplizieren fehlgeschlagen." }, { status: 500 });
  }
}
