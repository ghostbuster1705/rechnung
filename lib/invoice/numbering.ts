import { prisma } from "@/lib/prisma";

function renderPattern(pattern: string, counter: number, date = new Date()) {
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const cc = String(counter).padStart(3, "0");

  return pattern
    .replaceAll("{{year}}", yyyy)
    .replaceAll("{{month}}", mm)
    .replaceAll("{{counter}}", cc);
}

export async function reserveInvoiceNumber(orgId: string) {
  return prisma.$transaction(async (tx) => {
    const org = await tx.organization.findUniqueOrThrow({
      where: { id: orgId },
      select: {
        invoiceCounter: true,
        invoiceNumberPattern: true,
      },
    });

    const number = renderPattern(org.invoiceNumberPattern, org.invoiceCounter);

    await tx.organization.update({
      where: { id: orgId },
      data: { invoiceCounter: { increment: 1 } },
    });

    return number;
  });
}
