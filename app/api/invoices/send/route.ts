import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";
import { generateZugferdXml } from "@/lib/zugferd/xml";
import { generateInvoicePdf } from "@/lib/pdf/generate-invoice-pdf";
import { sendInvoiceEmail } from "@/lib/email/send-invoice-email";
import { InvoiceTotals } from "@/lib/invoice/calculations";
import { InvoiceGenerateValues } from "@/lib/validations/invoice";

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const invoiceId = String(body.invoiceId || "");

    if (!invoiceId) {
      return NextResponse.json({ error: "invoiceId fehlt." }, { status: 400 });
    }

    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        orgId: session.user.organizationId,
      },
      include: {
        client: true,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Rechnung nicht gefunden." }, { status: 404 });
    }

    if (!invoice.client.email && !body.to) {
      return NextResponse.json({ error: "Kunde hat keine E-Mail-Adresse." }, { status: 400 });
    }

    const invoicePayload: InvoiceGenerateValues = {
      number: invoice.number,
      seller: invoice.sellerSnapshot as InvoiceGenerateValues["seller"],
      buyer: invoice.buyerSnapshot as InvoiceGenerateValues["buyer"],
      invoice: {
        issueDate: invoice.issueDate.toISOString(),
        deliveryDate: invoice.deliveryDate.toISOString(),
        dueDate: invoice.dueDate.toISOString(),
        paymentTerms: invoice.paymentTerms || "Zahlbar ohne Abzug.",
        reference: invoice.reference || "",
        currency: "EUR",
      },
      lineItems: invoice.lineItems as InvoiceGenerateValues["lineItems"],
      notes: invoice.notes || "",
      reverseCharge: Boolean(invoice.notes?.toLowerCase().includes("reverse charge")),
      kleinunternehmerMode: Boolean(
        invoice.notes?.toLowerCase().includes("§19") ||
          invoice.notes?.toLowerCase().includes("kleinunternehmer"),
      ),
      clientId: invoice.clientId,
    };

    const totals = invoice.totals as InvoiceTotals;
    const xml = generateZugferdXml({
      invoice: invoicePayload,
      totals,
    });

    const pdfBytes = await generateInvoicePdf(invoicePayload, totals, xml);

    await sendInvoiceEmail({
      to: body.to || invoice.client.email!,
      subject: `Rechnung ${invoice.number}`,
      message: body.message || `Im Anhang finden Sie die Rechnung ${invoice.number}.`,
      pdfBytes,
      invoiceNumber: invoice.number,
    });

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: "SENT",
        sentAt: new Date(),
        isLocked: true,
        xmlContent: xml,
      },
    });

    await prisma.auditLog.create({
      data: {
        orgId: session.user.organizationId,
        userId: session.user.id,
        entity: "Invoice",
        entityId: invoice.id,
        action: "SENT",
      },
    });

    return NextResponse.json({ message: "Rechnung wurde versendet." });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
    }

    return NextResponse.json({ error: "Rechnung konnte nicht versendet werden." }, { status: 500 });
  }
}
