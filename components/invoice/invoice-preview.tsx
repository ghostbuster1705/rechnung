"use client";

import { calculateLineTotal, InvoiceTotals } from "@/lib/invoice/calculations";
import { formatCurrency } from "@/lib/utils";
import { InvoiceFormValues } from "@/lib/validations/invoice";

type Props = {
  values: InvoiceFormValues;
  totals: InvoiceTotals;
};

export function InvoicePreview({ values, totals }: Props) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
      <h3 className="mb-4 text-lg font-semibold">Live-Vorschau</h3>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <h4 className="text-sm font-semibold text-slate-300">Verkäufer</h4>
          <p className="text-sm">{values.seller.name}</p>
          <p className="text-sm text-slate-400">{values.seller.street}</p>
          <p className="text-sm text-slate-400">
            {values.seller.postalCode} {values.seller.city}
          </p>
          <p className="text-sm text-slate-400">{values.seller.country}</p>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-slate-300">Käufer</h4>
          <p className="text-sm">{values.buyer.name}</p>
          <p className="text-sm text-slate-400">{values.buyer.street}</p>
          <p className="text-sm text-slate-400">
            {values.buyer.postalCode} {values.buyer.city}
          </p>
          <p className="text-sm text-slate-400">{values.buyer.country}</p>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-left text-slate-400">
              <th className="py-2">Beschreibung</th>
              <th className="py-2">Menge</th>
              <th className="py-2">Einzelpreis</th>
              <th className="py-2">MwSt.</th>
              <th className="py-2 text-right">Netto</th>
            </tr>
          </thead>
          <tbody>
            {values.lineItems.map((item, index) => (
              <tr key={`${item.description}-${index}`} className="border-b border-slate-900">
                <td className="py-2">{item.description || "-"}</td>
                <td className="py-2">
                  {item.quantity} {item.unit}
                </td>
                <td className="py-2">{formatCurrency(item.unitPriceNet)}</td>
                <td className="py-2">{values.kleinunternehmerMode ? 0 : item.vatRate}%</td>
                <td className="py-2 text-right">{formatCurrency(calculateLineTotal(item))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 space-y-1 border-t border-slate-800 pt-3 text-sm">
        {totals.breakdown.map((row) => (
          <div key={row.vatRate} className="flex items-center justify-between text-slate-300">
            <span>Netto {row.vatRate}%</span>
            <span>{formatCurrency(row.net)}</span>
          </div>
        ))}
        <div className="flex items-center justify-between text-slate-300">
          <span>MwSt gesamt</span>
          <span>{formatCurrency(totals.taxTotal)}</span>
        </div>
        <div className="flex items-center justify-between text-base font-semibold">
          <span>Gesamtbetrag</span>
          <span>{formatCurrency(totals.grossTotal)}</span>
        </div>
      </div>
    </div>
  );
}
