import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkRateLimit, API_RATE_LIMIT, AUTH_RATE_LIMIT } from "@/lib/rate-limit";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- Rate limiting ---
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";

  // Stricter limit on auth routes
  if (pathname.startsWith("/api/auth")) {
    const result = checkRateLimit(`auth:${ip}`, AUTH_RATE_LIMIT);
    if (!result.allowed) {
      return NextResponse.json(
        { error: "Слишком много запросов. Попробуйте позже." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((result.retryAfterMs || 60000) / 1000)),
          },
        }
      );
    }
  }

  // General API rate limit
  if (pathname.startsWith("/api/")) {
    const result = checkRateLimit(`api:${ip}`, API_RATE_LIMIT);
    if (!result.allowed) {
      return NextResponse.json(
        { error: "Слишком много запросов. Попробуйте позже." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((result.retryAfterMs || 60000) / 1000)),
          },
        }
      );
    }
  }

  // --- Auth guard ---
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
    "/api/:path*",
  ],
};
