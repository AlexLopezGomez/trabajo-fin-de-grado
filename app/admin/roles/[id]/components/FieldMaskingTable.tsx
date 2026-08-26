"use client";

import { EyeOff, Eye, XCircle } from "lucide-react";

interface FieldMaskingTableProps {
    fieldMasking?: Record<string, Record<string, "visible" | "masked" | "hidden">>;
}

export function FieldMaskingTable({ fieldMasking }: FieldMaskingTableProps) {
    if (!fieldMasking || Object.keys(fieldMasking).length === 0) return null;

    return (
        <div className="bg-card/50 border border-border rounded-lg p-6 mt-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <EyeOff className="w-5 h-5 text-primary" />
                Field Visibility
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
                Some fields have visibility restrictions based on role. This role's access to sensitive fields:
            </p>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-muted/30 border-b border-border">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                                Collection
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                                Field
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                                Access
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {Object.entries(fieldMasking).flatMap(([collection, fields]) =>
                            Object.entries(fields).map(([field, access]) => (
                                <tr key={`${collection}-${field}`} className="hover:bg-muted/10">
                                    <td className="px-4 py-3 font-mono text-sm text-white">
                                        {collection}
                                    </td>
                                    <td className="px-4 py-3 font-mono text-sm text-white">
                                        {field}
                                    </td>
                                    <td className="px-4 py-3">
                                        {access === "visible" ? (
                                            <span className="inline-flex items-center gap-1 text-emerald-400 text-sm">
                                                <Eye className="w-4 h-4" />
                                                Visible
                                            </span>
                                        ) : access === "masked" ? (
                                            <span className="inline-flex items-center gap-1 text-amber-400 text-sm">
                                                <EyeOff className="w-4 h-4" />
                                                Masked
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-red-400 text-sm">
                                                <XCircle className="w-4 h-4" />
                                                Hidden
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
