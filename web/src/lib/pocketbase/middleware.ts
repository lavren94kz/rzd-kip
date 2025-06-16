import { NextRequest, NextResponse } from "next/server";
import PocketBase from "pocketbase";
import { COOKIE_NAME } from "./server";
import { SyncAuthStore } from "./stores/sync-auth-store";
import { TypedPocketBase } from "./types";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next();

  const client = new PocketBase(
    process.env.NEXT_PUBLIC_POCKETBASE_URL,
    new SyncAuthStore({
      save: async (serializedPayload) => {
        request.cookies.set(COOKIE_NAME, serializedPayload);
        response = NextResponse.next({
          request,
        });
        response.cookies.set(COOKIE_NAME, serializedPayload);
      },
      clear: async () => {
        request.cookies.delete(COOKIE_NAME);
        response = NextResponse.next({
          request,
        });
        response.cookies.delete(COOKIE_NAME);
      },
      initial: request.cookies.get(COOKIE_NAME)?.value,
    }),
  ) as TypedPocketBase;

  // Check if the session is still valid
  if (client.authStore.isValid) {
    try {
      await client.collection("users").authRefresh();
    } catch (error) {
      console.error('Auth refresh error:', error);
      client.authStore.clear();
    }
  }

  // Only redirect to login if not accessing public routes
  const publicPaths = ['/', '/login', '/register'];
  const isPublicPath = publicPaths.includes(request.nextUrl.pathname);

  if (!client.authStore.isValid && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    response = NextResponse.redirect(url);
  }

  return response;
}