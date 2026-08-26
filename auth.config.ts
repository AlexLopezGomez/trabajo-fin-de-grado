import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Auth Configuration (Edge Compatible)
 * 
 * This file contains the authentication configuration that is safe to run
 * in the Edge Runtime (Middleware). It intentionally avoids Node.js
 * specific modules like 'mongodb' or 'bcryptjs'.
 * 
 * The full auth logic (including DB persistence) is in @/auth.ts
 */
export const authConfig = {
    session: {
        strategy: "jwt",
        // Enterprise standard: 8 hours (default)
        maxAge: 8 * 60 * 60,
    },
    pages: {
        signIn: "/login",
        error: "/login",
    },
    trustHost: true,
    providers: [
        // Google OAuth is Edge compatible (HTTP based)
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            authorization: {
                params: {
                    prompt: "consent",
                    access_type: "offline",
                    response_type: "code",
                    ...(process.env.ALLOWED_EMAIL_DOMAIN && {
                        hd: process.env.ALLOWED_EMAIL_DOMAIN,
                    }),
                },
            },
        }),
    ],
    callbacks: {
        async signIn({ user, account }) {
            // Domain restriction (Env var check is safe on Edge)
            if (account?.provider === "google") {
                const email = user.email;
                const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN;

                if (allowedDomain && !email?.endsWith(`@${allowedDomain}`)) {
                    console.warn(`[AUTH] Blocked sign-in: email domain not allowed`, { email, allowedDomain });
                    return false;
                }
            }
            return true;
        },
        async jwt({ token, user, account, trigger }) {
            // Basic token population (No DB calls here - handled in auth.ts override)
            if (user) {
                token.id = user.id;
                token.provider = account?.provider;
                token.picture = user.image;
                // Role will be populated by auth.ts, or default to token value if already set
            }
            return token;
        },
        async session({ session, token }) {
            // Basic session population (No DB calls here - handled in auth.ts override)
            if (token && session.user) {
                session.user.id = token.id as string;
                session.user.provider = token.provider as string | undefined;
                session.user.image = token.picture as string | undefined;
                // CRITICAL: Map role for Middleware RBAC (token has it from auth.ts)
                session.user.role = token.role as string;
                session.user.country = token.country as string | undefined;
            }
            return session;
        }
    }
} satisfies NextAuthConfig;
