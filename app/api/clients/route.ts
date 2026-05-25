import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";

const clientSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  street: z.string().min(2),
  postalCode: z.string().min(4),
  city: z.string().min(2),
  country: z.string().min(2),
  vatId: z.string().optional().or(z.literal("")),
  taxId: z.string().optional().or(z.literal("")),
});

export async function GET() {
  try {
    const session = await requireAuth();

    const clients = await prisma.client.findMany({
      where: { orgId: session.user.organizationId },
      include: {
        _count: {
          select: {
            invoices: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ clients });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
    }

    return NextResponse.json({ error: "Kunden konnten nicht geladen werden." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const parsed = clientSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Ungültige Kundendaten." }, { status: 400 });
    }

    const client = await prisma.client.create({
      data: {
        orgId: session.user.organizationId,
        name: parsed.data.name,
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
        street: parsed.data.street,
        postalCode: parsed.data.postalCode,
        city: parsed.data.city,
        country: parsed.data.country,
        vatId: parsed.data.vatId || null,
        taxId: parsed.data.taxId || null,
      },
    });

    return NextResponse.json({ client }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
    }

    return NextResponse.json({ error: "Kunde konnte nicht erstellt werden." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const parsed = clientSchema.safeParse(body);

    if (!parsed.success || !parsed.data.id) {
      return NextResponse.json({ error: "Ungültige Kundendaten." }, { status: 400 });
    }

    const existing = await prisma.client.findFirst({
      where: { id: parsed.data.id, orgId: session.user.organizationId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Kunde nicht gefunden." }, { status: 404 });
    }

    const client = await prisma.client.update({
      where: { id: parsed.data.id },
      data: {
        name: parsed.data.name,
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
        street: parsed.data.street,
        postalCode: parsed.data.postalCode,
        city: parsed.data.city,
        country: parsed.data.country,
        vatId: parsed.data.vatId || null,
        taxId: parsed.data.taxId || null,
      },
    });

    return NextResponse.json({ client });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
    }

    return NextResponse.json({ error: "Kunde konnte nicht aktualisiert werden." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Kunden-ID fehlt." }, { status: 400 });
    }

    const existing = await prisma.client.findFirst({
      where: { id, orgId: session.user.organizationId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Kunde nicht gefunden." }, { status: 404 });
    }

    const linkedInvoices = await prisma.invoice.count({
      where: { clientId: id, orgId: session.user.organizationId },
    });

    if (linkedInvoices > 0) {
      return NextResponse.json(
        { error: "Kunde mit Rechnungsverlauf darf aus GoBD-Gründen nicht gelöscht werden." },
        { status: 409 },
      );
    }

    await prisma.client.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Kunde gelöscht." });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
    }

    return NextResponse.json({ error: "Kunde konnte nicht gelöscht werden." }, { status: 500 });
  }
}
