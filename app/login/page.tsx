"use client";

/**
 * Login Page
 *
 * Security features:
 * - Google OAuth as primary authentication (SSO)
 * - Credentials fallback for admin/service accounts
 * - Domain restriction messaging
 * - No demo credentials exposed
 */

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Loader2,
  Mail,
  Lock,
  AlertCircle,
  ArrowLeft,
  Sparkles,
  Shield,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils/common";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex bg-background overflow-hidden">

      {/* ── LEFT PANEL: Visual ── */}
      <div className="hidden lg:flex flex-col w-[55%] relative overflow-hidden border-r border-border">
        {/* Dashboard mockup image */}
        <img
          src="/login-visual.svg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-top"
        />

        {/* Gradient: transparent at top so image shows, dark at bottom for text */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, hsl(0 0% 4%) 0%, hsl(0 0% 4% / 0.88) 28%, hsl(0 0% 4% / 0.2) 58%, transparent 75%)",
          }}
        />

        {/* Right-edge separator */}
        <div className="absolute right-0 inset-y-0 w-px bg-gradient-to-b from-transparent via-[hsl(145_55%_30%/0.5)] to-transparent" />

        {/* Top bar: back link + logo */}
        <div className="relative z-20 flex items-center justify-between px-10 pt-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al inicio
          </Link>
          <img
            src="/logo-dashboard.svg"
            alt="Sistema conversacional para dashboards"
            className="h-8 w-auto"
          />
        </div>

        {/* Branding text at the bottom */}
        <div className="relative z-20 mt-auto px-12 pb-12 space-y-5">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border"
            style={{
              background: "hsl(145 55% 30% / 0.12)",
              borderColor: "hsl(145 55% 30% / 0.30)",
              color: "hsl(145 55% 48%)",
            }}
          >
            <Sparkles className="w-3 h-3" />
            Impulsado por IA
          </div>

          <h1 className="text-4xl font-bold text-foreground leading-tight tracking-tight">
            Consulta tus datos
            <br />
            <span style={{ color: "hsl(145 55% 42%)" }}>
              en lenguaje natural
            </span>
          </h1>

          <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
            Convierte preguntas en pipelines MongoDB. Sin SQL, sin código, sin
            barreras.
          </p>

          <div className="flex flex-wrap gap-4 pt-1">
            {["RBAC multi-rol", "Auditoría completa", "Multi-tenant"].map(
              (f) => (
                <span
                  key={f}
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
                >
                  <CheckCircle2
                    className="w-3 h-3"
                    style={{ color: "hsl(145 55% 40%)" }}
                  />
                  {f}
                </span>
              )
            )}
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL: Login form ── */}
      <div className="flex-1 relative flex flex-col min-h-screen">
        {/* Mobile background effects */}
        <div className="absolute inset-0 lg:hidden bg-grid-pattern opacity-[0.12] pointer-events-none" />
        <div className="absolute inset-0 bg-radial-glow opacity-40 pointer-events-none" />

        {/* Mobile-only: back link at top */}
        <div className="relative z-10 p-6 lg:hidden">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al inicio
          </Link>
        </div>

        {/* Form — centered */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 py-12">
          <div className="w-full max-w-[360px] space-y-6">
            {/* Mobile logo */}
            <div className="flex lg:hidden justify-center mb-2">
              <img
                src="/logo-dashboard.svg"
                alt="Sistema conversacional para dashboards"
                className="h-8 w-auto"
              />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-foreground">
                Bienvenido de nuevo
              </h2>
              <p className="text-muted-foreground text-sm mt-1">
                Inicia sesión para acceder al panel
              </p>
            </div>

            <div className="p-7 bg-card/80 border border-border rounded-2xl backdrop-blur-sm shadow-2xl">
              <Suspense
                fallback={
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-7 h-7 animate-spin text-brand-sky" />
                  </div>
                }
              >
                <LoginForm />
              </Suspense>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <Shield className="w-3 h-3" />
              <span>Plataforma protegida con controles de seguridad</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Login form ── */
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const errorParam = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(
    errorParam ? getErrorMessage(errorParam) : ""
  );
  const [loading, setLoading] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoadingGoogle(true);
    setError("");
    try {
      await signIn("google", { callbackUrl });
    } catch (_err) {
      setError("Error al conectar con Google. Inténtalo de nuevo.");
      setLoadingGoogle(false);
    }
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (result?.error) {
        if (result.error.includes("Google sign-in")) {
          setError(result.error);
        } else {
          setError("Email o contraseña incorrectos");
        }
        setLoading(false);
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (_err) {
      setError("Ocurrió un error. Inténtalo de nuevo.");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 p-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* ── Credentials form — always visible ── */}
      <form onSubmit={handleCredentialsSubmit} className="space-y-4">
        <div className="space-y-2">
          <label
            htmlFor="email"
            className="block text-sm font-medium text-foreground"
          >
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={cn(
                "w-full pl-10 pr-4 py-3 border border-input bg-background rounded-xl",
                "text-foreground placeholder:text-muted-foreground",
                "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary",
                "transition-all duration-200"
              )}
              placeholder="tu@empresa.com"
              disabled={loading || loadingGoogle}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-foreground"
          >
            Contraseña
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={cn(
                "w-full pl-10 pr-4 py-3 border border-input bg-background rounded-xl",
                "text-foreground placeholder:text-muted-foreground",
                "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary",
                "transition-all duration-200"
              )}
              placeholder="••••••••"
              disabled={loading || loadingGoogle}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || loadingGoogle}
          className={cn(
            "w-full py-3 px-4 font-medium rounded-xl",
            "bg-gradient-to-r from-brand-sky to-brand-sky-dark text-white",
            "hover:shadow-lg hover:shadow-brand-sky/20",
            "focus:outline-none focus:ring-2 focus:ring-brand-sky focus:ring-offset-2 focus:ring-offset-background",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "transition-all duration-200"
          )}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Iniciando sesión...
            </span>
          ) : (
            "Iniciar sesión"
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-3 text-muted-foreground">O</span>
        </div>
      </div>

      {/* ── Google Sign-In — secondary, at the bottom ── */}
      <button
        onClick={handleGoogleSignIn}
        disabled={loadingGoogle || loading}
        className={cn(
          "w-full flex items-center justify-center gap-3 py-3 px-4",
          "bg-white hover:bg-gray-50 text-gray-800 font-medium",
          "rounded-xl border border-gray-200",
          "transition-all duration-200 shadow-sm hover:shadow-md",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        {loadingGoogle ? (
          <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
        ) : (
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
        )}
        <span>Continuar con Google</span>
      </button>

      {/* Domain notice */}
      {process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN && (
        <p className="text-center text-xs text-muted-foreground">
          Solo se permiten cuentas{" "}
          <span className="text-foreground font-medium">
            @{process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN}
          </span>
        </p>
      )}
    </div>
  );
}

/**
 * Map NextAuth error codes to user-friendly messages
 */
function getErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case "OAuthAccountNotLinked":
      return "Este email ya está registrado con otro método de inicio de sesión.";
    case "OAuthSignin":
    case "OAuthCallback":
      return "Error al conectar con Google. Inténtalo de nuevo.";
    case "OAuthCreateAccount":
      return "No se pudo crear la cuenta. Contacta con soporte.";
    case "Callback":
      return "Error de autenticación. Inténtalo de nuevo.";
    case "AccessDenied":
      return "Acceso denegado. Tu dominio de email no está autorizado.";
    case "CredentialsSignin":
      return "Email o contraseña incorrectos.";
    default:
      return "Ocurrió un error. Inténtalo de nuevo.";
  }
}
