"use client";

import Link from "next/link";
import { Search, Users } from "lucide-react";
import type { HomepageClient } from "@/lib/types/database";
import { ClientCard } from "./client-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ClientGridProps {
  clients: HomepageClient[];
  hasFilters?: boolean;
  isAdmin?: boolean;
  mediaBuyers?: string[];
  selectionMode?: boolean;
  selectedIds?: string[];
  onToggleId?: (id: string) => void;
  onClearFilters?: () => void;
}

export function ClientGrid({
  clients,
  hasFilters = false,
  isAdmin = false,
  mediaBuyers = [],
  selectionMode = false,
  selectedIds = [],
  onToggleId,
  onClearFilters,
}: ClientGridProps) {
  if (clients.length === 0) {
    if (hasFilters) {
      return (
        <EmptyState
          icon={Search}
          title="No clients match your filters"
          description="Try adjusting your search or filter criteria"
          action={
            onClearFilters ? (
              <Button variant="outline" size="sm" onClick={onClearFilters}>
                Clear Filters
              </Button>
            ) : undefined
          }
        />
      );
    }

    return (
      <EmptyState
        icon={Users}
        title="Welcome to Ad Lab"
        description="Start by adding your first client to monitor their Google Ads performance"
        action={
          isAdmin ? (
            <Button asChild>
              <Link href="/clients/new">Add First Client</Link>
            </Button>
          ) : undefined
        }
      />
    );
  }

  const selectedSet = new Set(selectedIds);

  return (
    <div>
      <p className="mb-3">
        <Badge variant="secondary">
          {clients.length} {clients.length === 1 ? "client" : "clients"}
          {hasFilters ? " found" : ""}
        </Badge>
      </p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {clients.map((client) => (
          <ClientCard
            key={client.id}
            client={client}
            mediaBuyers={mediaBuyers}
            selectionMode={selectionMode}
            selected={selectedSet.has(client.id)}
            onToggle={onToggleId ? () => onToggleId(client.id) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
