"use client";

import { useState } from "react";
import DestinationForm from "@/components/destinations/DestinationForm";
import DestinationsList from "@/components/destinations/DestinationsList";
import type { Destination } from "@/types/destination";

export default function DestinationsManager() {
  const [reloadKey, setReloadKey] = useState(0);
  const [editingDestination, setEditingDestination] = useState<Destination | null>(null);

  return (
    <div className="space-y-8">
      <DestinationForm
        editingDestination={editingDestination}
        onSaved={() => setReloadKey((current) => current + 1)}
        onCancelEdit={() => setEditingDestination(null)}
      />
      <DestinationsList
        reloadKey={reloadKey}
        onEdit={(dest) => {
          setEditingDestination(dest);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />
    </div>
  );
}
