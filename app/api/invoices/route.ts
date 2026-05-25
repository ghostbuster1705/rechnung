import { NextResponse } from "next/server";
import { startOfMonth } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";
import { invoiceFormSchema } from "@/lib/validations/invoice";
import { calculateInvoiceTotals } from "@/lib/invoice/calculations";
import { reserveInvoiceNumber } from "@/lib/invoice/numbering";
import { PLAN_CONFIG } from "@/lib/stripe/plans";

export async function GET(request: Request) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);

    const q = searchParams.get("q")?.trim();
    const status = searchParams.get("status")?.trim();
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const invoices = await prisma.invoice.findMany({
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
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ invoices });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
    }

    return NextResponse.json({ error: "Rechnungen konnten nicht geladen werden." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const parsed = invoiceFormSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Ungültige Eingaben." },
        { status: 400 },
      );
    }

    const org = await prisma.organization.findUniqueOrThrow({
      where: { id: session.user.organizationId },
      select: { id: true, plan: true, kleinunternehmerMode: true },
    });

    if (org.plan === "FREE") {
      const usedInMonth = await prisma.invoice.count({
        where: {
          orgId: org.id,
          createdAt: { gte: startOfMonth(new Date()) },
        },
      });

      if (usedInMonth >= PLAN_CONFIG.FREE.invoiceLimit) {
        return NextResponse.json(
          {
            error:
              "Im Free-Plan sind maximal 5 Rechnungen pro Monat möglich. Bitte auf Pro upgraden.",
          },
          { status: 402 },
        );
      }
    }

    const payload = parsed.data;
    const number = await reserveInvoiceNumber(org.id);
    const totals = calculateInvoiceTotals(payload.lineItems, {
      kleinunternehmerMode: payload.kleinunternehmerMode || org.kleinunternehmerMode,
    });

    const client = payload.clientId
      ? await prisma.client.findFirst({
          where: { id: payload.clientId, orgId: org.id },
        })
      : null;

    const ensuredClient =
      client ??
      (await prisma.client.create({
        data: {
          orgId: org.id,
          name: payload.buyer.name,
          email: payload.buyer.email || null,
          phone: payload.buyer.phone || null,
          street: payload.buyer.street,
          postalCode: payload.buyer.postalCode,
          city: payload.buyer.city,
          country: payload.buyer.country,
          vatId: payload.buyer.vatId || null,
          taxId: payload.buyer.taxId || null,
        },
      }));

    const invoice = await prisma.invoice.create({
      data: {
        orgId: org.id,
        clientId: ensuredClient.id,
        number,
        issueDate: new Date(payload.invoice.issueDate),
        deliveryDate: new Date(payload.invoice.deliveryDate),
        dueDate: new Date(payload.invoice.dueDate),
        paymentTerms: payload.invoice.paymentTerms,
        reference: payload.invoice.reference || null,
        lineItems: payload.lineItems,
        totals,
        notes: payload.notes || null,
        buyerSnapshot: payload.buyer,
        sellerSnapshot: payload.seller,
      },
      include: {
        client: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        orgId: org.id,
        userId: session.user.id,
        entity: "Invoice",
        entityId: invoice.id,
        action: "CREATED",
        payload: {
          number: invoice.number,
          status: invoice.status,
        },
      },
    });

    return NextResponse.json({
      invoice,
      invoicePayload: {
        ...payload,
        number,
      },
      totals,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
    }

    return NextResponse.json({ error: "Rechnung konnte nicht erstellt werden." }, { status: 500 });
  }
}
