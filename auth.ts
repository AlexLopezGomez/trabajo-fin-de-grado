import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { auth as authLogger, error as logError } from "@/lib/utils/logger";
import type { JWTPayload, UserRole } from "@/lib/auth/auth.types";
import { isValidUserDocument } from "@/lib/auth/auth.types";
import { authConfig } from "@/auth.config";
import { getAuthDatabase } from "@/lib/db";

export type { UserRole };

// ============================================
// TYPE DECLARATIONS - Extended Session
// ============================================

declare module "next-auth" {
  interface User {
    role: UserRole;
    country?: string;
    image?: string;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: UserRole;
      country?: string;
      image?: string;
      provider?: string;
    };
  }
}

// JWT type extension handled via callbacks - token typing is done inline

// ============================================
// DATABASE HELPERS - Shared Connection Pool
// Uses the shared pool from lib/db instead of per-request clients
// ============================================

/**
 * Find or create user for OAuth sign-in
 * Implements account linking by email
 */
async function findOrCreateOAuthUser(
  oauthUser: { email: string; name: string; image?: string },
  provider: string
): Promise<{
  id: string;
  email: string;
  name: string;
  role: UserRole;
  country?: string;
  image?: string;
  sessionVersion?: number;
}> {
  const db = await getAuthDatabase();

  const user = await db.collection("app_users").findOne({
    email: oauthUser.email,
  });

  if (user) {
    const providers = user.providers || [];
    if (!providers.includes(provider)) {
      await db.collection("app_users").updateOne(
        { _id: user._id },
        {
          $addToSet: { providers: provider },
          $set: {
            lastLoginAt: new Date(),
            image: oauthUser.image || user.image,
          },
        }
      );
      authLogger(`Linked ${provider} to existing user`, user._id.toString(), { email: user.email, provider });
    } else {
      await db.collection("app_users").updateOne(
        { _id: user._id },
        { $set: { lastLoginAt: new Date() } }
      );
    }

    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      country: user.country,
      image: oauthUser.image || user.image,
      sessionVersion: user.sessionVersion,
    };
  }

  const newUser = {
    email: oauthUser.email,
    name: oauthUser.name,
    role: "operator",
    providers: [provider],
    image: oauthUser.image,
    createdAt: new Date(),
    lastLoginAt: new Date(),
    createdBy: "oauth_auto_provision",
  };

  const result = await db.collection("app_users").insertOne(newUser);

  authLogger('Created new OAuth user', result.insertedId.toString(), {
    email: newUser.email,
    role: 'operator',
    provider
  });

  return {
    id: result.insertedId.toString(),
    email: newUser.email,
    name: newUser.name,
    role: newUser.role,
    image: newUser.image,
    sessionVersion: 1,
  };
}

/**
 * Log authentication events for audit trail
 */
async function logAuthEvent(
  eventType: string,
  details: Record<string, unknown>
): Promise<void> {
  try {
    const db = await getAuthDatabase();
    const { withNamespaceField } = await import("@/lib/db/namespace");
    await db.collection("auth_audit_logs").insertOne(withNamespaceField({
      eventType,
      ...details,
      timestamp: new Date(),
    }));
  } catch (error) {
    logError('[AUTH_AUDIT] Failed to log event', error);
  }
}

// ============================================
// NEXTAUTH CONFIGURATION (FULL NODE.JS VERSION)
// ============================================

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  session: {
    strategy: "jwt",
    // Enterprise standard: 8 hours (configurable via env)
    maxAge: parseInt(process.env.NEXTAUTH_SESSION_MAX_AGE || "28800"),
  },

  // ============================================
  // PROVIDERS (Including Credentials)
  // ============================================
  providers: [
    ...authConfig.providers,

    // SECONDARY: Credentials (for admin fallback / service accounts)
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // Dynamic imports to avoid Edge runtime issues (though this file runs in Node)
        const bcrypt = await import("bcryptjs");
        const { headers } = await import("next/headers");
        const {
          isAccountLocked,
          getAccountLockout,
          recordFailedAttempt,
          clearFailedAttempts,
          getClientIp,
          getClientUserAgent,
        } = await import("@/lib/auth/account-lockout.service");

        if (!credentials?.email || !credentials?.password) {
          logError('Auth error: Missing credentials');
          await new Promise((resolve) => setTimeout(resolve, 1000));
          throw new Error("Invalid credentials");
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        // Get request metadata for security tracking
        const headersList = await headers();
        const ipAddress = getClientIp(headersList);
        const userAgent = getClientUserAgent(headersList);

        // SECURITY: Check if account is locked due to failed attempts
        const locked = await isAccountLocked(email);

        if (locked) {
          const lockout = await getAccountLockout(email);

          if (lockout) {
            const minutesRemaining = Math.ceil(
              (lockout.unlockAt.getTime() - Date.now()) / 60000
            );

            // Record the attempt during lockout
            await recordFailedAttempt(email, ipAddress, userAgent, 'ACCOUNT_LOCKED');

            logError('Auth blocked: Account locked', undefined, {
              email,
              minutesRemaining,
              failureCount: lockout.failureCount,
            });

            throw new Error(
              `Account temporarily locked due to multiple failed login attempts. ` +
              `Try again in ${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''} or contact support.`
            );
          }
        }

        const db = await getAuthDatabase();

        const user = await db.collection("app_users").findOne({
          email: email.toLowerCase(),
        });

        // Always perform bcrypt comparison to equalize timing
        const dummyHash = "$2a$12$" + "R".repeat(53);
        const hashToCompare = (user && user.password) ? (user.password as string) : dummyHash;

        const isValid = await bcrypt.compare(password, hashToCompare);

        if (!user || !user.password || !isValid) {
          const reason = !user ? 'INVALID_EMAIL' : 'INVALID_PASSWORD';
          await recordFailedAttempt(email, ipAddress, userAgent, reason);

          logError('Auth error: Invalid credentials', undefined, {
            email,
            reason,
            ipAddress,
          });

          throw new Error("Invalid credentials");
        }

        await clearFailedAttempts(email);

        await db.collection("app_users").updateOne(
          { _id: user._id },
          {
            $set: { lastLoginAt: new Date() },
            $addToSet: { providers: "credentials" },
          }
        );

        authLogger('Auth success via credentials', user._id.toString(), {
          email: user.email,
          role: user.role,
          ipAddress,
        });

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          country: user.country,
          image: user.image,
        };
      },
    }),
  ],

  // ============================================
  // CALLBACKS (DB ENRICHED)
  //Override auth.config.ts callbacks with DB features
  // ============================================
  callbacks: {
    /**
     * Sign-In Callback
     * Validates domain restriction for Google OAuth and Logs event
     */
    async signIn({ user, account }) {
      // Logic from authConfig (domain check)
      const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN;
      if (account?.provider === "google") {
        if (allowedDomain && !user.email?.endsWith(`@${allowedDomain}`)) {
          // Blocked by authConfig, but we double check or just let it pass to logging
          // Actually authConfig runs first if we call super? No, we override.
          // So we must re-implement the check.
          logError('Blocked sign-in: email domain not allowed', undefined, {
            email: user.email,
            allowedDomain
          });
          return false;
        }
      }

      // Non-blocking audit log (DB only in Node)
      logAuthEvent("sign_in", {
        userId: user.id,
        email: user.email,
        provider: account?.provider,
        success: true,
      }).catch(() => { });

      return true;
    },

    /**
     * JWT Callback
     * Enriches token with user data from database.
     * Session version is checked periodically (every 5 min) instead of per-request.
     */
    async jwt({ token, user, account, trigger }) {
      // Initial sign-in: populate token from DB user
      if (account && user) {
        if (account.provider === "google") {
          const dbUser = await findOrCreateOAuthUser(
            {
              email: user.email!,
              name: user.name!,
              image: user.image || undefined,
            },
            account.provider
          );
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.country = dbUser.country;
          token.provider = account.provider;
          token.picture = dbUser.image;
          token.sessionVersion = dbUser.sessionVersion || 1;
        } else {
          token.id = user.id;
          token.role = user.role;
          token.country = user.country;
          token.provider = "credentials";
          token.picture = user.image;
          // Credentials authorize() already fetched the user, grab sessionVersion via a single query
          try {
            const db = await getAuthDatabase();
            const { ObjectId } = await import("mongodb");
            const userDoc = await db
              .collection("app_users")
              .findOne({ _id: new ObjectId(user.id) }, { projection: { sessionVersion: 1 } });
            token.sessionVersion = userDoc?.sessionVersion || 1;
          } catch {
            token.sessionVersion = 1;
          }
        }
        token.sessionVersionCheckedAt = Date.now();
      }

      // Explicit session update: always re-verify
      if (trigger === "update" && token?.id) {
        try {
          const db = await getAuthDatabase();
          const { ObjectId } = await import("mongodb");
          const userDoc = await db
            .collection("app_users")
            .findOne({ _id: new ObjectId(token.id as string) });
          const validUserDoc = userDoc && isValidUserDocument(userDoc) ? userDoc : null;
          const currentVersion = validUserDoc?.sessionVersion || 1;
          const tokenPayload = token as unknown as JWTPayload;
          if (tokenPayload.sessionVersion !== currentVersion) {
            throw new Error("Session invalidated");
          }
          token.role = validUserDoc?.role || token.role;
          tokenPayload.sessionVersion = currentVersion;
          token.sessionVersionCheckedAt = Date.now();
        } catch (e) {
          throw e instanceof Error ? e : new Error("Session invalidated");
        }
      }

      // Periodic session version check (every 5 minutes)
      const SESSION_CHECK_INTERVAL = 5 * 60 * 1000;
      const lastCheck = (token.sessionVersionCheckedAt as number) || 0;
      if (token?.id && !account && trigger !== "update" && Date.now() - lastCheck > SESSION_CHECK_INTERVAL) {
        try {
          const db = await getAuthDatabase();
          const { ObjectId } = await import("mongodb");
          const userDoc = await db
            .collection("app_users")
            .findOne(
              { _id: new ObjectId(token.id as string) },
              { projection: { sessionVersion: 1, role: 1 } }
            );
          if (userDoc) {
            const currentVersion = userDoc.sessionVersion || 1;
            const tokenPayload = token as unknown as JWTPayload;
            if (tokenPayload.sessionVersion !== currentVersion) {
              throw new Error("Session invalidated");
            }
            token.role = userDoc.role || token.role;
          }
          token.sessionVersionCheckedAt = Date.now();
        } catch (e) {
          if (e instanceof Error && e.message === "Session invalidated") throw e;
          // Don't fail auth on transient DB errors
        }
      }

      return token;
    },

    /**
     * Session Callback
     * Copies token data to session. No DB calls — validation is handled in JWT callback.
     */
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.country = token.country as string | undefined;
        session.user.provider = token.provider as string | undefined;
        session.user.image = token.picture as string | undefined;
      }
      return session;
    },
  },

  // ============================================
  // EVENTS - Audit Logging
  // ============================================
  events: {
    async signIn({ user, account }) {
      // Non-blocking audit log
      logAuthEvent("sign_in", {
        userId: user.id,
        email: user.email,
        provider: account?.provider,
        success: true,
      }).catch(() => { }); // Ignore errors
    },

    async signOut(message) {
      // Non-blocking audit log
      // Handle both JWT and session-based signouts
      const token = "token" in message ? message.token : null;
      logAuthEvent("sign_out", {
        userId: token?.id,
        email: token?.email,
      }).catch(() => { }); // Ignore errors
    },
  },
});
