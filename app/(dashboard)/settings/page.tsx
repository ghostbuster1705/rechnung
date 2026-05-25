import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SettingsForm } from "@/components/settings/settings-form";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const organization = await prisma.organization.findUniqueOrThrow({
    where: { id: session.user.organizationId },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Firmeneinstellungen</h1>
        <p className="text-sm text-slate-400">Standardwerte, Rechnungsmuster, Bankdaten und Abo-Konfiguration</p>
      </div>
      <SettingsForm organization={organization} />
    </div>
  );
}
