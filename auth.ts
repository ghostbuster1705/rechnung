import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations/auth";
import { verifyPassword } from "@/lib/auth/password";

const configuredSecret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
const authSecret = configuredSecret ?? "invoicede-local-dev-secret-change-me";

if (!configuredSecret) {
  // Stabiler Fallback für lokale Umgebungen, damit Middleware nicht mit MissingSecret crasht.
  console.warn(
    "[auth] AUTH_SECRET/NEXTAUTH_SECRET fehlt. Fallback-Secret aktiv (nur lokal verwenden).",
  );
}

const providers: Provider[] = [
  Credentials({
    name: "E-Mail & Passwort",
    credentials: {
      email: { label: "E-Mail", type: "email" },
      password: { label: "Passwort", type: "password" },
    },
    async authorize(credentials) {
      const parsed = loginSchema.safeParse(credentials);
      if (!parsed.success) {
        return null;
      }

      const user = await prisma.user.findUnique({
        where: { email: parsed.data.email },
      });

      if (!user?.passwordHash) {
        return null;
      }

      const valid = await verifyPassword(parsed.data.password, user.passwordHash);
      if (!valid) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        organizationId: user.organizationId,
        role: user.role,
      };
    },
  }),
];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  );
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  secret: authSecret,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers,
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.organizationId = user.organizationId;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.organizationId = String(token.organizationId ?? "");
        session.user.role = String(token.role ?? "member");
      }
      return session;
    },
  },
});
