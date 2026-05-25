import { InvoiceGenerateValues } from "@/lib/validations/invoice";
import { InvoiceTotals } from "@/lib/invoice/calculations";

export type ZugferdDocumentInput = {
  invoice: InvoiceGenerateValues;
  totals: InvoiceTotals;
};
