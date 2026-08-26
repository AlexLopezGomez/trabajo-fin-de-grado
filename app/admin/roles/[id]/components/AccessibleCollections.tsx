"use client";

import { Database } from "lucide-react";

export function AccessibleCollections({ collections }: { collections?: string[] | "*" }) {
    const isAll = collections === "*";
    const collectionList = Array.isArray(collections) ? collections : [];
    const count = isAll ? "All" : collectionList.length;

    return (
        <div className="bg-card/50 border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                Accessible Collections ({count})
            </h2>
            <div className="space-y-2">
                {isAll ? (
                    <div className="p-3 rounded-lg bg-muted/20 border border-border flex items-center gap-3">
                        <Database className="w-4 h-4 text-primary" />
                        <span className="font-mono text-white font-medium">All Collections Accessible</span>
                    </div>
                ) : collectionList.length > 0 ? (
                    collectionList.map((collection) => (
                        <div
                            key={collection}
                            className="p-3 rounded-lg bg-muted/20 border border-border flex items-center gap-3"
                        >
                            <Database className="w-4 h-4 text-muted-foreground" />
                            <span className="font-mono text-white">{collection}</span>
                        </div>
                    ))
                ) : (
                    <p className="text-muted-foreground text-sm">
                        No collection access configured
                    </p>
                )}
            </div>
        </div>
    );
}
