import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Protected routes
  const protectedPaths = ["/overview", "/site", "/ads", "/settings", "/onboarding"];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  if (isProtected && !req.auth) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Redirect authenticated users from login to overview
  if (pathname === "/login" && req.auth) {
    return NextResponse.redirect(new URL("/overview", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/overview/:path*",
    "/site/:path*",
    "/ads/:path*",
    "/settings/:path*",
    "/onboarding/:path*",
    "/login",
  ],
};
