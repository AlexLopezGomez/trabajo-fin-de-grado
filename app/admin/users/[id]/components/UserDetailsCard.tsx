"use client";

import { Mail, Building2 } from "lucide-react";

interface UserDetailsCardProps {
    email: string;
    country?: string;
}

/**
 * User Details Card Component
 * Sidebar card displaying user details
 */
export function UserDetailsCard({
    email,
    country,
}: UserDetailsCardProps) {
    return (
        <div className="bg-card/50 border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">
                Details
            </h2>

            <div className="space-y-4">
                {/* Email */}
                <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                        Email
                    </label>
                    <div className="flex items-center gap-2 text-sm text-white">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span className="break-all">{email}</span>
                    </div>
                </div>


                {/* Country */}
                {country && (
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">
                            Country
                        </label>
                        <div className="flex items-center gap-2 text-sm text-white">
                            <span className="text-lg">{getFlagEmoji(country)}</span>
                            <span>{country}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// Helper function to get flag emoji from country code
function getFlagEmoji(countryCode: string): string {
    const codePoints = countryCode
        .toUpperCase()
        .split("")
        .map((char) => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
}
