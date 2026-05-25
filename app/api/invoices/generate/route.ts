import { NextResponse } from "next/server";
import { invoiceGenerateSchema } from "@/lib/validations/invoice";
import { calculateInvoiceTotals } from "@/lib/invoice/calculations";
import { generateZugferdXml } from "@/lib/zugferd/xml";
import { generateInvoicePdf } from "@/lib/pdf/generate-invoice-pdf";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = invoiceGenerateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Ungültige Eingaben für die PDF-Erzeugung." },
        { status: 400 },
      );
    }

    const invoice = parsed.data;
    const totals = calculateInvoiceTotals(invoice.lineItems, {
      kleinunternehmerMode: invoice.kleinunternehmerMode,
    });
    const xml = generateZugferdXml({ invoice, totals });
    const pdfBytes = await generateInvoicePdf(invoice, totals, xml);

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${invoice.number}.pdf"`,
        "X-ZUGFERD-PROFILE": "BASIC",
      },
    });
  } catch {
    return NextResponse.json({ error: "PDF/ZUGFeRD Generierung fehlgeschlagen." }, { status: 500 });
  }
}
