import { calculateInvoiceTotals } from "../lib/invoice/calculations";
import { generateZugferdXml } from "../lib/zugferd/xml";
import { InvoiceGenerateValues } from "../lib/validations/invoice";

const sampleInvoice: InvoiceGenerateValues = {
  number: "RE-2026-001",
  clientId: "sample-client",
  seller: {
    name: "Muster GmbH",
    street: "Musterstraße 1",
    postalCode: "10115",
    city: "Berlin",
    country: "DE",
    taxId: "12/345/67890",
    vatId: "",
    iban: "DE44500105175407324931",
    bic: "INGDDEFFXXX",
    email: "rechnung@muster-gmbh.de",
    phone: "+49 30 123456",
  },
  buyer: {
    name: "Kunde AG",
    street: "Kundenweg 9",
    postalCode: "20095",
    city: "Hamburg",
    country: "DE",
    taxId: "",
    vatId: "DE987654321",
    email: "buchhaltung@kunde-ag.de",
    phone: "+49 40 123456",
  },
  invoice: {
    issueDate: "2026-05-25",
    deliveryDate: "2026-05-25",
    dueDate: "2026-06-08",
    paymentTerms: "Zahlbar innerhalb von 14 Tagen ohne Abzug.",
    reference: "PO-12345",
    currency: "EUR",
  },
  lineItems: [
    {
      description: "Beratungsleistung",
      quantity: 8,
      unit: "h",
      unitPriceNet: 110,
      vatRate: 19,
    },
  ],
  notes: "",
  reverseCharge: false,
  kleinunternehmerMode: false,
};

const totals = calculateInvoiceTotals(sampleInvoice.lineItems, {
  kleinunternehmerMode: sampleInvoice.kleinunternehmerMode,
});
const xml = generateZugferdXml({ invoice: sampleInvoice, totals });

const mustContain = [
  "<rsm:CrossIndustryInvoice",
  "urn:factur-x.eu:1p0:basic",
  "<ram:ExchangedDocumentContext",
  "<ram:ApplicableHeaderTradeSettlement>",
];

for (const marker of mustContain) {
  if (!xml.includes(marker)) {
    throw new Error(`ZUGFeRD-XML fehlt Pflichtteil: ${marker}`);
  }
}

const endpoint = process.env.ZUGFERD_VALIDATOR_ENDPOINT;
if (!endpoint) {
  console.log("Lokale Strukturprüfung erfolgreich (kein externer Validator konfiguriert).");
  process.exit(0);
}

const response = await fetch(endpoint, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    ...(process.env.ZUGFERD_VALIDATOR_TOKEN
      ? { Authorization: `Bearer ${process.env.ZUGFERD_VALIDATOR_TOKEN}` }
      : {}),
  },
  body: JSON.stringify({ xml }),
});

if (!response.ok) {
  const body = await response.text();
  throw new Error(`Validator API Fehler (${response.status}): ${body}`);
}

console.log("Validator API Prüfung erfolgreich.");
