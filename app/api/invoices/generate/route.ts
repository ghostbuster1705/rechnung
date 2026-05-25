import { NextResponse } from "next/server";
import { invoiceGenerateSchema } from "@/lib/validations/invoice";
import { calculateInvoiceTotals } from "@/lib/invoice/calculations";
import { generateZugferdXml } from "@/lib/zugferd/xml";
import { embedZugferdXML, generateVisualPdf } from "@/lib/pdf/generate";

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

    const visualPdfBytes = await generateVisualPdf(invoice, totals);
    const xmlContent = generateZugferdXml({ invoice, totals });
    const finalPdfBytes = await embedZugferdXML(visualPdfBytes, xmlContent, {
      profile: "BASIC",
    });

    return new NextResponse(Buffer.from(finalPdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Rechnung-${invoice.number}.pdf"`,
        "X-ZUGFERD-PROFILE": "BASIC",
      },
    });
  } catch {
    return NextResponse.json({ error: "PDF/ZUGFeRD Generierung fehlgeschlagen." }, { status: 500 });
  }
}
