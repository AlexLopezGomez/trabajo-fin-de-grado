"use client";

import { useState } from "react";
import { createGroup } from "@/app/actions/admin/groups";

export function useCreateGroup(onSuccess: () => void) {
    const [showCreate, setShowCreate] = useState(false);
    const [newName, setNewName] = useState("");
    const [newDesc, setNewDesc] = useState("");
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleCreateGroup = async () => {
        if (!newName.trim()) {
            setError("Group name is required");
            return;
        }
        setCreating(true);
        setError(null);
        try {
            const res = await createGroup(newName, newDesc);
            if (!res.success) {
                setError(res.error || "Failed to create group");
                setCreating(false);
                return;
            }
            setShowCreate(false);
            setNewName("");
            setNewDesc("");
            onSuccess();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to create group");
        } finally {
            setCreating(false);
        }
    };

    const openModal = () => {
        setShowCreate(true);
        setNewName("");
        setNewDesc("");
        setError(null);
    };

    return {
        showCreate,
        newName,
        newDesc,
        creating,
        error,
        setShowCreate,
        setNewName,
        setNewDesc,
        handleCreateGroup,
        openModal,
    };
}
