/**
 * Enterprise Middleware - Server-Side Route Protection
 *
 * This middleware runs on the Edge runtime and protects all routes
 * at the server level - it cannot be bypassed by disabling JavaScript.
 *
 * Security Model:
 * - All routes require authentication by default
 * - Public routes are explicitly whitelisted
 * - Role-based access control for sensitive routes
 * - Precise regex matching to prevent route bypass
 * - Security event logging for audit trail
 */

import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";
import { middleware as logMiddleware } from "@/lib/utils/logger";

const { auth } = NextAuth(authConfig);

type EdgeSecurityEvent = {
  type: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  userId?: string;
  email?: string;
  role?: string;
  path?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
};

function logSecurityEventEdge(event: EdgeSecurityEvent): void {
  console.warn("[SECURITY EVENT][EDGE]", {
    ...event,
    timestamp: new Date().toISOString(),
  });
}

// ============================================
// ROUTE CONFIGURATION
// ============================================

/**
 * Routes that don't require authentication
 * These are the ONLY routes accessible without a session
 */
const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/api/auth", // NextAuth endpoints
];

/**
 * Routes that require specific roles with PRECISE regex matching
 * Format: { pattern: [allowed_roles] }
 *
 * SECURITY: Using regex with (?:\/|$) ensures exact path matching:
 * - /admin matches /admin, /admin/, /admin/*
 * - Does NOT match /adminpanel, /administration
 */
const ROLE_PROTECTED_ROUTES: Array<{ pattern: RegExp; roles: string[]; name: string }> = [
  // 1. Approvals Page: Accessible by Admin and Supervisor
  {
    pattern: /^\/admin\/approvals(?:\/|$)/,
    roles: ["admin", "supervisor"],
    name: "Query Approvals"
  },
  // 1b. Query Analytics: Accessible by Admin and Supervisor
  {
    pattern: /^\/admin\/query-analytics(?:\/|$)/,
    roles: ["admin", "supervisor"],
    name: "Query Analytics"
  },
  // 2. Admin Root: Accessible by Admin and Supervisor (Supervisor redirects to approvals)
  {
    pattern: /^\/admin$/,
    roles: ["admin", "supervisor"],
    name: "Admin Panel"
  },
  // 3. All other Admin pages: Strictly Admin only
  // Matches /admin/users, /admin/groups, etc. but NOT /admin/approvals or /admin/query-analytics
  {
    pattern: /^\/admin\/(?!approvals|query-analytics).*/,
    roles: ["admin"],
    name: "Admin Restricted Area"
  },
  {
    pattern: /^\/settings\/users(?:\/|$)/,
    roles: ["admin"],
    name: "User Settings"
  },
  {
    pattern: /^\/settings\/roles(?:\/|$)/,
    roles: ["admin"],
    name: "Role Settings"
  },
];

/**
 * Paths that should bypass middleware entirely
 * Includes static assets and Next.js internal endpoints
 */
const shouldBypass = (pathname: string): boolean => {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/__nextjs") || // Next.js internal endpoints (dev tools)
    pathname.includes(".") // Files with extensions (images, fonts, etc.)
  );
};

// ============================================
// MIDDLEWARE FUNCTION
// ============================================

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const pathname = nextUrl.pathname;

  // Skip static assets and internal endpoints
  if (shouldBypass(pathname)) {
    return NextResponse.next();
  }

  // Check if this is a public route
  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  // ============================================
  // AUTHENTICATION CHECK
  // ============================================

  if (!session?.user) {
    // Not authenticated
    if (isPublicRoute) {
      // Allow access to public routes
      return NextResponse.next();
    }

    // Redirect to login with callback URL
    const loginUrl = new URL("/login", nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);

    logMiddleware(`Unauthenticated access to ${pathname} → /login`);

    return NextResponse.redirect(loginUrl);
  }

  // ============================================
  // AUTHENTICATED USER HANDLING
  // ============================================

  // If authenticated user tries to access login page, redirect to home
  if (pathname === "/login") {
    return NextResponse.redirect(new URL("/", nextUrl.origin));
  }

  // ============================================
  // ROLE-BASED ACCESS CONTROL
  // ============================================

  for (const route of ROLE_PROTECTED_ROUTES) {
    if (route.pattern.test(pathname)) {
      const userRole = session.user.role;

      if (!route.roles.includes(userRole)) {
        logMiddleware(`Access denied: ${session.user.email} (${userRole}) → ${pathname} (requires: ${route.roles.join(", ")})`);

        logSecurityEventEdge({
          type: 'UNAUTHORIZED_ADMIN_ACCESS',
          severity: 'CRITICAL',
          userId: session.user.id,
          email: session.user.email,
          role: userRole,
          path: pathname,
          ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || 'unknown',
          userAgent: req.headers.get('user-agent') || 'unknown',
          details: {
            attemptedRoute: pathname,
            requiredRoles: route.roles,
            userRole: userRole,
            routeName: route.name,
          },
        });

        const deniedUrl = new URL("/access-denied", nextUrl.origin);
        return NextResponse.redirect(deniedUrl);
      }
    }
  }

  // ============================================
  // SECURITY HEADERS
  // ============================================

  const response = NextResponse.next();

  // Add security headers
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  // Content Security Policy
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://accounts.google.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ];

  response.headers.set(
    "Content-Security-Policy",
    cspDirectives.join("; ")
  );

  // HSTS (production only)
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  return response;
});

// ============================================
// MIDDLEWARE CONFIGURATION
// ============================================

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, robots.txt, etc.
     * - Public assets (images, fonts)
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.png$|.*\\.jpg$|.*\\.svg$|.*\\.ico$).*)",
  ],
};

