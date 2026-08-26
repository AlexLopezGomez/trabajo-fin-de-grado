import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function AccessDeniedPage() {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="max-w-md w-full text-center space-y-6">
                {/* Icon */}
                <div className="relative inline-block">
                    <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full"></div>
                    <div className="relative bg-card border border-red-500/30 p-4 rounded-2xl shadow-lg shadow-red-500/10">
                        <ShieldAlert className="w-12 h-12 text-red-500" />
                    </div>
                </div>

                {/* Content */}
                <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-white tracking-tight">
                        Acceso Denegado
                    </h1>
                    <p className="text-muted-foreground">
                        No tienes los permisos necesarios para acceder a esta página.
                    </p>
                </div>

                {/* Action */}
                <div className="pt-2">
                    <Link
                        href="/"
                        className="inline-flex items-center px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
                    >
                        Volver al Inicio
                    </Link>
                </div>
            </div>
        </div>
    );
}
