"use client";

/**
 * Admin UI - Spaces Management
 * FR-5: Space-Aware Permission Assignment
 * 
 * Refactored for scalability with modular components and custom hooks.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SpaceSummary } from "@/types/spaces";

// Custom hooks
import { useAdminSpaces } from "./hooks/useAdminSpaces";

// Components
import { AdminSpacesHeader } from "./components/AdminSpacesHeader";
import { SpacesFilters } from "./components/SpacesFilters";
import { AdminSpaceCard } from "./components/AdminSpaceCard";
import { EmptySpacesList } from "./components/EmptySpacesList";
import { CreateSpaceModal } from "./components/CreateSpaceModal";
import { LoadingSpinner, ErrorAlert } from "./components/AdminStates";

export default function AdminSpacesPage() {
  const router = useRouter();
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Custom hook for spaces data and filtering
  const {
    spaces,
    loading,
    error,
    search,
    setSearch,
    typeFilter,
    setTypeFilter,
    clearFilters,
  } = useAdminSpaces();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <AdminSpacesHeader
        spaceCount={spaces.length}
        onCreateClick={() => setShowCreateModal(true)}
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Filters */}
        <SpacesFilters
          search={search}
          typeFilter={typeFilter}
          onSearchChange={setSearch}
          onTypeChange={setTypeFilter}
          onClearFilters={clearFilters}
        />

        {/* Loading state */}
        {loading && <LoadingSpinner />}

        {/* Error state */}
        {error && <ErrorAlert message={error} />}

        {/* Spaces grid */}
        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {spaces.length === 0 ? (
              <EmptySpacesList />
            ) : (
              spaces.map((space) => (
                <AdminSpaceCard
                  key={space.id}
                  space={space}
                  onClick={() => router.push(`/admin/spaces/${space.id}`)}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* Create Space Modal */}
      <CreateSpaceModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={(space: SpaceSummary) => {
          // Note: The hook automatically refetches, but we could also update locally
          setShowCreateModal(false);
        }}
      />
    </div>
  );
}
