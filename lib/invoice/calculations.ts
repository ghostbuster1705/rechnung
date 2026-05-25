import { InvoiceLineItem } from "@/lib/validations/invoice";

export type TaxBreakdownRow = {
  vatRate: number;
  net: number;
  tax: number;
  gross: number;
};

export type InvoiceTotals = {
  netTotal: number;
  taxTotal: number;
  grossTotal: number;
  breakdown: TaxBreakdownRow[];
};

const round2 = (value: number) => Math.round(value * 100) / 100;

export function calculateLineTotal(item: InvoiceLineItem) {
  return round2(item.quantity * item.unitPriceNet);
}

export function calculateInvoiceTotals(
  lineItems: InvoiceLineItem[],
  options?: { kleinunternehmerMode?: boolean },
): InvoiceTotals {
  const breakdownMap = new Map<number, TaxBreakdownRow>();

  for (const item of lineItems) {
    const net = calculateLineTotal(item);
    const vatRate = options?.kleinunternehmerMode ? 0 : item.vatRate;
    const tax = round2(net * (vatRate / 100));

    const existing = breakdownMap.get(vatRate) ?? {
      vatRate,
      net: 0,
      tax: 0,
      gross: 0,
    };

    existing.net = round2(existing.net + net);
    existing.tax = round2(existing.tax + tax);
    existing.gross = round2(existing.gross + net + tax);

    breakdownMap.set(vatRate, existing);
  }

  const breakdown = [...breakdownMap.values()].sort((a, b) => b.vatRate - a.vatRate);
  const netTotal = round2(breakdown.reduce((acc, item) => acc + item.net, 0));
  const taxTotal = round2(breakdown.reduce((acc, item) => acc + item.tax, 0));
  const grossTotal = round2(netTotal + taxTotal);

  return {
    netTotal,
    taxTotal,
    grossTotal,
    breakdown,
  };
}
