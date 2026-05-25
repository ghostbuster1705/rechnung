import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";

export async function GET(
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
      include: {
        client: true,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Rechnung nicht gefunden." }, { status: 404 });
    }

    return NextResponse.json({
      invoice,
      invoicePayload: {
        number: invoice.number,
        seller: invoice.sellerSnapshot,
        buyer: invoice.buyerSnapshot,
        invoice: {
          issueDate: invoice.issueDate.toISOString().slice(0, 10),
          deliveryDate: invoice.deliveryDate.toISOString().slice(0, 10),
          dueDate: invoice.dueDate.toISOString().slice(0, 10),
          paymentTerms: invoice.paymentTerms || "",
          reference: invoice.reference || "",
          currency: "EUR",
        },
        lineItems: invoice.lineItems,
        notes: invoice.notes || "",
        reverseCharge: Boolean(invoice.notes?.toLowerCase().includes("reverse charge")),
        kleinunternehmerMode: Boolean(
          invoice.notes?.toLowerCase().includes("§19") ||
            invoice.notes?.toLowerCase().includes("kleinunternehmer"),
        ),
        clientId: invoice.clientId,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
    }

    return NextResponse.json({ error: "Rechnung konnte nicht geladen werden." }, { status: 500 });
  }
}
