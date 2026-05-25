import { NextResponse } from "next/server";
import { auth } from "@/auth";

const protectedPatterns = [
  /^\/invoices/,
  /^\/clients/,
  /^\/settings/,
  /^\/api\/invoices/,
  /^\/api\/clients/,
  /^\/api\/organization/,
  /^\/api\/stripe\/checkout/,
];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isProtected = protectedPatterns.some((pattern) => pattern.test(pathname));

  if (isProtected && !req.auth) {
    return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
  }

  if ((pathname === "/login" || pathname === "/register") && req.auth) {
    return NextResponse.redirect(new URL("/invoices", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
