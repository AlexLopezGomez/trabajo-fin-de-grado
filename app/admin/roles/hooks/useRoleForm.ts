"use client";

import { useState, useCallback } from "react";
import { PERMISSION_CATALOG } from "@/lib/auth/permissions/catalog";

export interface RoleFormData {
    name: string;
    description: string;
    permissionIds: string[];
}

export function useRoleForm(initialData?: Partial<RoleFormData>) {
    const [formData, setFormData] = useState<RoleFormData>({
        name: initialData?.name || "",
        description: initialData?.description || "",
        permissionIds: initialData?.permissionIds || [],
    });

    // Group permissions by category for logic reference
    const permissionsByCategory = PERMISSION_CATALOG.reduce((acc, permission) => {
        if (!acc[permission.category]) {
            acc[permission.category] = [];
        }
        acc[permission.category].push(permission);
        return acc;
    }, {} as Record<string, typeof PERMISSION_CATALOG>);

    const handleTogglePermission = useCallback((permissionId: string) => {
        setFormData((prev) => ({
            ...prev,
            permissionIds: prev.permissionIds.includes(permissionId)
                ? prev.permissionIds.filter((id) => id !== permissionId)
                : [...prev.permissionIds, permissionId],
        }));
    }, []);

    const handleSelectAllCategory = useCallback((category: string) => {
        const categoryPermissions = permissionsByCategory[category];
        if (!categoryPermissions) return;

        const categoryIds = categoryPermissions.map((p) => p.id);

        setFormData((prev) => {
            const allSelected = categoryIds.every((id) =>
                prev.permissionIds.includes(id)
            );

            if (allSelected) {
                // Deselect all in category
                return {
                    ...prev,
                    permissionIds: prev.permissionIds.filter(
                        (id) => !categoryIds.includes(id)
                    ),
                };
            } else {
                // Select all in category
                return {
                    ...prev,
                    permissionIds: [
                        ...prev.permissionIds,
                        ...categoryIds.filter((id) => !prev.permissionIds.includes(id)),
                    ],
                };
            }
        });
    }, [permissionsByCategory]);

    const handleChange = (field: keyof RoleFormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const isValid =
        formData.name.trim().length >= 3 &&
        formData.description.trim().length >= 10 &&
        formData.permissionIds.length > 0;

    return {
        formData,
        setFormData, // Exposed for full resets if needed
        handleChange,
        handleTogglePermission,
        handleSelectAllCategory,
        permissionsByCategory,
        isValid
    };
}
