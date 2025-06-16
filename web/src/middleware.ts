import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { fallbackLng, languages } from "./app/i18n/settings";
import { createServerClient } from "@/lib/pocketbase/server";

// Protected routes that require authentication
const protectedRoutes = ["/dashboard"];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip middleware for static files, API routes, etc.
  if (
    pathname.includes(".") || // files with extensions
    pathname.startsWith("/_next/") || // Next.js internals
    pathname.startsWith("/api/") // API routes
  ) {
    return NextResponse.next();
  }

  // Check if pathname starts with a locale
  const pathnameHasLocale = languages.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (!pathnameHasLocale) {
    // Redirect if there is no locale
    const locale = fallbackLng;
    const newUrl = new URL(request.url);
    newUrl.pathname = `/${locale}${pathname}`;
    return NextResponse.redirect(newUrl);
  }

  // Extract the path without the locale prefix for route checking
  const pathWithoutLocale = pathname.replace(/^\/[a-z]{2}/, "");

  // Check if the route requires authentication
  if (protectedRoutes.some((route) => pathWithoutLocale.startsWith(route))) {
    const client = await createServerClient();

    if (!client.authStore.isValid) {
      // Get auth cookie to check if we just authenticated
      const authCookie = request.cookies.get("pb_auth");

      // If we have no auth cookie, redirect to login
      if (!authCookie) {
        const locale = pathname.split("/")[1];
        const loginUrl = new URL(`/${locale}/login`, request.url);
        loginUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|images|favicon.ico).*)"],
};
