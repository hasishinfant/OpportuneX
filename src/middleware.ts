import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Temporarily disabled i18n middleware to allow app to run
// TODO: Restructure app directory with [locale] folder for proper i18n support
export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  // Match all pathnames except for
  // - /api (API routes)
  // - /_next (Next.js internals)
  // - /_vercel (Vercel internals)
  // - /manifest.json, /sw.js (PWA files)
  // - Static files (images, fonts, etc.)
  matcher: ['/((?!api|_next|_vercel|manifest.json|sw.js|.*\\..*).*)'],
};
