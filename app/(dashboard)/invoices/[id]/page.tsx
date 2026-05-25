import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { InvoiceActions } from "@/components/invoice/invoice-actions";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

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
    return (
      <div>
        <p>Rechnung wurde nicht gefunden.</p>
        <Link href="/invoices" className="text-emerald-400 hover:underline">
          Zurück zur Übersicht
        </Link>
      </div>
    );
  }

  const totals = invoice.totals as { netTotal: number; taxTotal: number; grossTotal: number };
  const lineItems = invoice.lineItems as Array<{
    description: string;
    quantity: number;
    unit: string;
    unitPriceNet: number;
    vatRate: number;
  }>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Rechnung {invoice.number}</h1>
          <p className="text-sm text-slate-400">Kunde: {invoice.client.name}</p>
        </div>
        <InvoiceActions invoiceId={invoice.id} number={invoice.number} canPay={invoice.status !== "PAID"} />
      </div>

      <div className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4 md:grid-cols-3">
        <div>
          <p className="text-xs text-slate-400">Status</p>
          <p className="font-semibold">{invoice.status}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Rechnungsdatum</p>
          <p className="font-semibold">{formatDate(invoice.issueDate)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Fällig am</p>
          <p className="font-semibold">{formatDate(invoice.dueDate)}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-left text-slate-400">
              <th className="px-3 py-2">Beschreibung</th>
              <th className="px-3 py-2">Menge</th>
              <th className="px-3 py-2">Einzelpreis</th>
              <th className="px-3 py-2">MwSt</th>
              <th className="px-3 py-2 text-right">Netto</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((item, index) => (
              <tr key={`${item.description}-${index}`} className="border-b border-slate-900/60">
                <td className="px-3 py-2">{item.description}</td>
                <td className="px-3 py-2">
                  {item.quantity} {item.unit}
                </td>
                <td className="px-3 py-2">{formatCurrency(item.unitPriceNet)}</td>
                <td className="px-3 py-2">{item.vatRate}%</td>
                <td className="px-3 py-2 text-right">{formatCurrency(item.quantity * item.unitPriceNet)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="ml-auto w-full max-w-md space-y-1 rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm">
        <div className="flex items-center justify-between">
          <span>Nettobetrag</span>
          <span>{formatCurrency(totals.netTotal)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>MwSt</span>
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
