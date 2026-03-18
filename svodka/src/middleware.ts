import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for session token (NextAuth sets this cookie)
  const hasSession = request.cookies.has("authjs.session-token") ||
    request.cookies.has("__Secure-authjs.session-token");

  const protectedPaths = ["/overview", "/site", "/ads", "/settings", "/onboarding", "/events"];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  if (isProtected && !hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname === "/login" && hasSession) {
    return NextResponse.redirect(new URL("/overview", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/overview/:path*",
    "/site/:path*",
    "/ads/:path*",
    "/settings/:path*",
    "/onboarding/:path*",
    "/events/:path*",
    "/login",
  ],
};
