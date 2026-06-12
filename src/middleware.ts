import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhook/(.*)' // Webhooks must be publicly accessible without auth
]);

export default clerkMiddleware(async (auth, request) => {
  const host = request.headers.get('host');
  
  // Force redirect from vercel domain to custom domain, except for webhooks to not break existing integrations
  if (host === 'lead-crmsss.vercel.app' && !request.nextUrl.pathname.startsWith('/api/webhook/')) {
    const newUrl = new URL(request.url);
    newUrl.hostname = 'crm.rankved.com';
    return NextResponse.redirect(newUrl, 308);
  }

  if (!isPublicRoute(request)) {
    await auth.protect({
      unauthenticatedUrl: new URL('/sign-in', request.url).toString(),
    });
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
    // Always run for Clerk-specific frontend API routes (required for Next.js 16)
    '/__clerk/(.*)',
  ],
};
