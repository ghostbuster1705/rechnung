import { auth } from "@/auth";

export async function requireAuth() {
  const session = await auth();

  if (!session?.user?.id || !session.user.organizationId) {
    throw new Error("UNAUTHORIZED");
  }

  return session;
}
