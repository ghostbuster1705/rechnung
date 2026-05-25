import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { InvoiceActions } from "@/components/invoice/invoice-actions";
import { formatCurrency, formatDate } from "@/lib/utils";

type Props = {
  searchParams?: {
    q?: string;
    status?: string;
    from?: string;
    to?: string;
  };
};

export default async function InvoicesPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const q = searchParams?.q?.trim();
  const status = searchParams?.status?.trim();
  const from = searchParams?.from;
  const to = searchParams?.to;

  const [invoices, statusCounts] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        orgId: session.user.organizationId,
        ...(status && status !== "ALL" ? { status: status as never } : {}),
        ...(from || to
          ? {
              issueDate: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
        ...(q
          ? {
              OR: [
                { number: { contains: q, mode: "insensitive" } },
                { client: { name: { contains: q, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      include: {
        client: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.invoice.groupBy({
      by: ["status"],
      where: { orgId: session.user.organizationId },
      _count: { status: true },
    }),
  ]);

  const countsMap = statusCounts.reduce<Record<string, number>>((acc, item) => {
    acc[item.status] = item._count.status;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Rechnungen</h1>
          <p className="text-sm text-slate-400">Übersicht, Versandstatus und Zahlungsmonitoring</p>
        </div>

        <Link href="/invoices/new" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">
          Neue Rechnung
        </Link>
      </div>

      <form className="grid gap-2 rounded-xl border border-slate-800 bg-slate-900/40 p-4 md:grid-cols-5">
        <input name="q" defaultValue={q} className="input md:col-span-2" placeholder="Suche nach Nummer oder Kunde" />
        <select name="status" defaultValue={status || "ALL"} className="input">
          <option value="ALL">Alle Status</option>
          <option value="DRAFT">Entwurf</option>
          <option value="SENT">Gesendet</option>
          <option value="PAID">Bezahlt</option>
          <option value="OVERDUE">Überfällig</option>
        </select>
        <input type="date" name="from" defaultValue={from} className="input" />
        <input type="date" name="to" defaultValue={to} className="input" />
        <button type="submit" className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800 md:col-span-5">
          Filter anwenden
        </button>
      </form>

      <div className="grid gap-3 md:grid-cols-4">
        {[
          ["DRAFT", "Entwurf"],
          ["SENT", "Gesendet"],
          ["PAID", "Bezahlt"],
          ["OVERDUE", "Überfällig"],
        ].map(([key, label]) => (
          <div key={key} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
            <p className="text-2xl font-semibold">{countsMap[key] ?? 0}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-left text-slate-400">
              <th className="px-3 py-2">Nummer</th>
              <th className="px-3 py-2">Kunde</th>
              <th className="px-3 py-2">Datum</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 text-right">Betrag</th>
              <th className="px-3 py-2">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => {
              const totals = invoice.totals as { grossTotal: number };
              return (
                <tr key={invoice.id} className="border-b border-slate-900/60 align-top">
                  <td className="px-3 py-2">
                    <Link href={`/invoices/${invoice.id}`} className="font-medium hover:underline">
                      {invoice.number}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{invoice.client.name}</td>
                  <td className="px-3 py-2">{formatDate(invoice.issueDate)}</td>
                  <td className="px-3 py-2">
                    <span className="rounded-full border border-slate-700 px-2 py-1 text-xs">
                      {invoice.status === "DRAFT" && "Entwurf"}
                      {invoice.status === "SENT" && "Gesendet"}
                      {invoice.status === "PAID" && "Bezahlt"}
                      {invoice.status === "OVERDUE" && "Überfällig"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">{formatCurrency(totals.grossTotal)}</td>
                  <td className="px-3 py-2">
                    <InvoiceActions invoiceId={invoice.id} number={invoice.number} canPay={invoice.status !== "PAID"} />
                  </td>
                </tr>
              );
            })}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-slate-400">
                  Keine Rechnungen gefunden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
