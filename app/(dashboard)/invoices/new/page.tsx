import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { InvoiceForm } from "@/components/invoice/invoice-form";

export default async function NewInvoicePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const [clients, organization] = await Promise.all([
    prisma.client.findMany({
      where: { orgId: session.user.organizationId },
      orderBy: { name: "asc" },
    }),
    prisma.organization.findUniqueOrThrow({
      where: { id: session.user.organizationId },
    }),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Neue Rechnung erstellen</h1>
        <p className="text-sm text-slate-400">ZUGFeRD 2.1 BASIC-konforme Datenerfassung</p>
      </div>

      <InvoiceForm clients={clients} organization={organization} />
    </div>
  );
}
