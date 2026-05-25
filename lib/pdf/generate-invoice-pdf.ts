import { PDFDocument, PDFName, StandardFonts, rgb } from "pdf-lib";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { calculateLineTotal, InvoiceTotals } from "@/lib/invoice/calculations";
import { InvoiceGenerateValues } from "@/lib/validations/invoice";

function buildPdfAXmpMetadata(invoiceNumber: string) {
  const timestamp = new Date().toISOString();
  return `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about=""
      xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/"
      xmlns:dc="http://purl.org/dc/elements/1.1/"
      xmlns:xmp="http://ns.adobe.com/xap/1.0/">
      <pdfaid:part>3</pdfaid:part>
      <pdfaid:conformance>B</pdfaid:conformance>
      <dc:title>
        <rdf:Alt><rdf:li xml:lang="x-default">Rechnung ${invoiceNumber}</rdf:li></rdf:Alt>
      </dc:title>
      <xmp:CreateDate>${timestamp}</xmp:CreateDate>
      <xmp:ModifyDate>${timestamp}</xmp:ModifyDate>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
}

export async function generateInvoicePdf(
  invoice: InvoiceGenerateValues,
  totals: InvoiceTotals,
  zugferdXml: string,
) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const page = pdfDoc.addPage([595.28, 841.89]);

  const drawText = (
    text: string,
    x: number,
    y: number,
    size = 10,
    isBold = false,
    color = rgb(0.1, 0.12, 0.2),
  ) => {
    page.drawText(text, {
      x,
      y,
      size,
      font: isBold ? bold : font,
      color,
    });
  };

  drawText("InvoiceDE", 50, 790, 16, true);
  drawText(`Rechnung ${invoice.number}`, 50, 765, 12, true);
  drawText(`Rechnungsdatum: ${format(new Date(invoice.invoice.issueDate), "dd.MM.yyyy", { locale: de })}`, 50, 748);
  drawText(`Leistungsdatum: ${format(new Date(invoice.invoice.deliveryDate), "dd.MM.yyyy", { locale: de })}`, 50, 734);
  drawText(`Fällig am: ${format(new Date(invoice.invoice.dueDate), "dd.MM.yyyy", { locale: de })}`, 50, 720);

  drawText("Verkäufer", 50, 690, 11, true);
  drawText(invoice.seller.name, 50, 675);
  drawText(`${invoice.seller.street}`, 50, 661);
  drawText(`${invoice.seller.postalCode} ${invoice.seller.city}, ${invoice.seller.country}`, 50, 647);
  drawText(`IBAN: ${invoice.seller.iban}`, 50, 633);
  drawText(`BIC: ${invoice.seller.bic}`, 50, 619);

  drawText("Käufer", 320, 690, 11, true);
  drawText(invoice.buyer.name, 320, 675);
  drawText(`${invoice.buyer.street}`, 320, 661);
  drawText(`${invoice.buyer.postalCode} ${invoice.buyer.city}, ${invoice.buyer.country}`, 320, 647);

  let currentY = 600;
  drawText("Pos.", 50, currentY, 10, true);
  drawText("Beschreibung", 90, currentY, 10, true);
  drawText("Menge", 330, currentY, 10, true);
  drawText("Einzelpreis", 390, currentY, 10, true);
  drawText("Netto", 490, currentY, 10, true);

  currentY -= 16;

  for (const [index, item] of invoice.lineItems.entries()) {
    const lineTotal = calculateLineTotal(item);
    drawText(String(index + 1), 50, currentY);
    drawText(item.description.slice(0, 36), 90, currentY);
    drawText(`${item.quantity} ${item.unit}`, 330, currentY);
    drawText(`${item.unitPriceNet.toFixed(2)} €`, 390, currentY);
    drawText(`${lineTotal.toFixed(2)} €`, 490, currentY);
    currentY -= 16;
  }

  currentY -= 14;
  drawText(`Nettobetrag: ${totals.netTotal.toFixed(2)} €`, 390, currentY, 10, true);
  currentY -= 14;
  drawText(`MwSt: ${totals.taxTotal.toFixed(2)} €`, 390, currentY, 10, true);
  currentY -= 14;
  drawText(`Gesamtbetrag: ${totals.grossTotal.toFixed(2)} €`, 390, currentY, 11, true);

  currentY -= 24;
  drawText(`Zahlungsbedingungen: ${invoice.invoice.paymentTerms}`, 50, currentY);
  if (invoice.notes) {
    currentY -= 14;
    drawText(`Hinweis: ${invoice.notes}`, 50, currentY);
  }

  if (invoice.kleinunternehmerMode) {
    currentY -= 14;
    drawText("Keine Ausweisung der Umsatzsteuer gemäß §19 UStG.", 50, currentY);
  }

  if (invoice.reverseCharge) {
    currentY -= 14;
    drawText("Reverse-Charge-Verfahren: Steuerschuldnerschaft des Leistungsempfängers.", 50, currentY);
  }

  await pdfDoc.attach(new TextEncoder().encode(zugferdXml), "factur-x.xml", {
    mimeType: "application/xml",
    description: "ZUGFeRD 2.1 / Factur-X XML",
    creationDate: new Date(),
    modificationDate: new Date(),
    afRelationship: "Data" as never,
  });

  // XMP-Metadaten für PDF/A-3b Kennzeichnung.
  const xmp = buildPdfAXmpMetadata(invoice.number);
  const metadataStream = pdfDoc.context.flateStream(xmp, {
    Type: "Metadata",
    Subtype: "XML",
  });
  const metadataRef = pdfDoc.context.register(metadataStream);
  pdfDoc.catalog.set(PDFName.of("Metadata"), metadataRef);

  pdfDoc.setTitle(`Rechnung ${invoice.number}`);
  pdfDoc.setAuthor(invoice.seller.name);
  pdfDoc.setSubject("Elektronische Rechnung im ZUGFeRD 2.1 BASIC Profil");
  pdfDoc.setKeywords(["ZUGFeRD", "Factur-X", "EN16931", invoice.number]);
  pdfDoc.setCreator("InvoiceDE");
  pdfDoc.setProducer("InvoiceDE PDF Engine");
  pdfDoc.setLanguage("de-DE");

  return pdfDoc.save();
}
