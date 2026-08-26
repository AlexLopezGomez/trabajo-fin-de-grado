"use client";

/**
 * SharingModeSelector Component
 * Renders the 3-option sharing mode selector (Private/Custom/Public)
 */

import { SHARING_MODES } from "./constants";
import type { SharingModeSelectorProps } from "./types";

export function SharingModeSelector({
    mode,
    onModeChange,
    disabled,
}: SharingModeSelectorProps) {
    return (
        <div>
            <label className="block text-sm font-medium text-white mb-3">
                Sharing Mode
            </label>
            <div className="grid grid-cols-3 gap-2">
                {SHARING_MODES.map(({ mode: modeValue, label, description, icon }) => (
                    <button
                        key={modeValue}
                        onClick={() => !disabled && onModeChange(modeValue)}
                        disabled={disabled}
                        className={`flex items-start gap-3 p-3 rounded-lg border transition-all text-left ${mode === modeValue
                                ? "bg-purple-500/20 border-purple-500/50 text-purple-400"
                                : "border-border hover:border-border/80 text-muted-foreground hover:text-white"
                            } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                        <div className="p-1.5 rounded bg-muted/50">{icon}</div>
                        <div>
                            <div className="text-sm font-medium">{label}</div>
                            <div className="text-xs opacity-70">{description}</div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
