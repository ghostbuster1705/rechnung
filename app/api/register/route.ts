import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations/auth";
import { hashPassword } from "@/lib/auth/password";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Ungültige Eingaben." },
      { status: 400 },
    );
  }

  const exists = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });

  if (exists) {
    return NextResponse.json(
      { error: "Ein Konto mit dieser E-Mail existiert bereits." },
      { status: 409 },
    );
  }

  const passwordHash = await hashPassword(parsed.data.password);

  const organization = await prisma.organization.create({
    data: {
      name: parsed.data.organizationName,
      users: {
        create: {
          name: parsed.data.name,
          email: parsed.data.email,
          passwordHash,
          role: "owner",
        },
      },
    },
    include: {
      users: true,
    },
  });

  return NextResponse.json({
    message: "Registrierung erfolgreich.",
    userId: organization.users[0]?.id,
  });
}
