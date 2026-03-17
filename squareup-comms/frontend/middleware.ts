import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side route protection via Next.js middleware.
 *
 * Uses a lightweight `__session` cookie (set by AuthProvider on the client)
 * to detect whether the user is authenticated. This cookie is NOT used for
 * actual authentication — Firebase tokens handle that. It's purely a signal
 * so middleware can redirect before the page renders.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has("__session");

  // Unauthenticated users trying to access protected routes → login
  if (!hasSession && (pathname.startsWith("/office") || pathname.startsWith("/workspace") || pathname.startsWith("/onboarding") || pathname.startsWith("/chat") || pathname.startsWith("/crm") || pathname.startsWith("/drive") || pathname.startsWith("/agents") || pathname.startsWith("/settings"))) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Authenticated users visiting login: let client-side handle redirect
  // based on onboarding status (middleware has no knowledge of it)

  return NextResponse.next();
}

export const config = {
  matcher: ["/office/:path*", "/workspace/:path*", "/onboarding/:path*", "/chat/:path*", "/crm/:path*", "/drive/:path*", "/agents/:path*", "/settings/:path*", "/login"],
};
