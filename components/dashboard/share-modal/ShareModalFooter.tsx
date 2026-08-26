"use client";

/**
 * ShareModalFooter Component
 * Footer with copy link button and save/cancel actions
 */

import { Copy, Check, AlertCircle } from "lucide-react";
import type { ShareModalFooterProps } from "./types";

export function ShareModalFooter({
    pendingChangesCount,
    saving,
    onCopyLink,
    copied,
    onCancel,
    onSave,
}: ShareModalFooterProps) {
    return (
        <div className="border-t border-border p-4 shrink-0">
            <div className="flex items-center justify-between">
                {/* Left: Copy Link */}
                <button
                    onClick={onCopyLink}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors"
                >
                    {copied ? (
                        <>
                            <Check className="w-4 h-4 text-emerald-400" />
                            <span className="text-emerald-400">Copied!</span>
                        </>
                    ) : (
                        <>
                            <Copy className="w-4 h-4" />
                            <span>Copy link</span>
                        </>
                    )}
                </button>

                {/* Right: Action Buttons */}
                <div className="flex items-center gap-3">
                    {pendingChangesCount > 0 && (
                        <span className="text-xs text-amber-400 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {pendingChangesCount} unsaved change{pendingChangesCount > 1 ? 's' : ''}
                        </span>
                    )}
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-muted-foreground hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onSave}
                        disabled={pendingChangesCount === 0 || saving}
                        className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}
