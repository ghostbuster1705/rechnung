import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";

const organizationSchema = z.object({
  name: z.string().min(2),
  vatId: z.string().optional().or(z.literal("")),
  taxId: z.string().optional().or(z.literal("")),
  street: z.string().optional().or(z.literal("")),
  postalCode: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  country: z.string().optional().or(z.literal("")),
  iban: z.string().optional().or(z.literal("")),
  bic: z.string().optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  logo: z.string().optional().or(z.literal("")),
  defaultVatRate: z.union([z.literal(0), z.literal(7), z.literal(19)]),
  invoiceNumberPattern: z.string().min(5),
  defaultPaymentTermDays: z.number().int().min(1).max(120),
  emailFooter: z.string().optional().or(z.literal("")),
  kleinunternehmerMode: z.boolean(),
});

export async function GET() {
  try {
    const session = await requireAuth();
    const organization = await prisma.organization.findUnique({
      where: { id: session.user.organizationId },
    });

    return NextResponse.json({ organization });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Firmeneinstellungen konnten nicht geladen werden." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const parsed = organizationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Ungültige Einstellungen." }, { status: 400 });
    }

    const organization = await prisma.organization.update({
      where: { id: session.user.organizationId },
      data: {
        ...parsed.data,
        vatId: parsed.data.vatId || null,
        taxId: parsed.data.taxId || null,
        street: parsed.data.street || null,
        postalCode: parsed.data.postalCode || null,
        city: parsed.data.city || null,
        country: parsed.data.country || null,
        iban: parsed.data.iban || null,
        bic: parsed.data.bic || null,
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
        logo: parsed.data.logo || null,
        emailFooter: parsed.data.emailFooter || null,
      },
    });

    return NextResponse.json({ organization });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Firmeneinstellungen konnten nicht gespeichert werden." },
      { status: 500 },
    );
  }
}
