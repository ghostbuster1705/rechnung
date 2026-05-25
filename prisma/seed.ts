import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = "demo@invoicede.local";
  const passwordHash = await bcrypt.hash("DemoPass123", 12);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Seed bereits vorhanden.");
    return;
  }

  const organization = await prisma.organization.create({
    data: {
      name: "Muster GmbH",
      street: "Musterstraße 1",
      postalCode: "10115",
      city: "Berlin",
      country: "DE",
      vatId: "DE123456789",
      iban: "DE44500105175407324931",
      bic: "INGDDEFFXXX",
      email: "rechnung@muster-gmbh.de",
      phone: "+49 30 123456",
    },
  });

  await prisma.user.create({
    data: {
      email,
      name: "Demo Admin",
      passwordHash,
      organizationId: organization.id,
      role: "owner",
    },
  });

  await prisma.client.create({
    data: {
      orgId: organization.id,
      name: "Beispiel Kunde AG",
      email: "buchhaltung@kunde-ag.de",
      street: "Kundenweg 9",
      postalCode: "20095",
      city: "Hamburg",
      country: "DE",
      vatId: "DE987654321",
    },
  });

  console.log("Seed erfolgreich erstellt.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
