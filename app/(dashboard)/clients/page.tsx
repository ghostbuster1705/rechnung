import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ClientsManager } from "@/components/clients/clients-manager";

export default async function ClientsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const clients = await prisma.client.findMany({
    where: { orgId: session.user.organizationId },
    include: {
      _count: { select: { invoices: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Kundenverwaltung</h1>
        <p className="text-sm text-slate-400">Kundenstammdaten und Rechnungsverlauf verwalten</p>
      </div>
      <ClientsManager initialClients={clients} />
    </div>
  );
}
