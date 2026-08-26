"use client";

import { Search } from "lucide-react";

interface GroupsSearchProps {
    value: string;
    onChange: (value: string) => void;
}

export function GroupsSearch({ value, onChange }: GroupsSearchProps) {
    return (
        <div className="mb-6">
            <div className="flex-1 min-w-[300px] relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Search groups by name or description..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-card/50 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                />
            </div>
        </div>
    );
}
