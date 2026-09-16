"use client";

import { useState } from "react";
import { WildlifeSpecies } from "@/types/wildlife";
import WildlifeForm from "@/components/wildlife/WildlifeForm";
import WildlifeList from "@/components/wildlife/WildlifeList";

export default function WildlifeManager() {
  const [reloadKey, setReloadKey] = useState(0);
  const [editingSpecies, setEditingSpecies] = useState<WildlifeSpecies | null>(null);

  function handleSaved() {
    setReloadKey((k) => k + 1);
    setEditingSpecies(null);
  }

  return (
    <div className="space-y-8">
      <WildlifeForm
        editingSpecies={editingSpecies}
        onSaved={handleSaved}
        onCancelEdit={() => setEditingSpecies(null)}
      />
      <WildlifeList reloadKey={reloadKey} onEdit={setEditingSpecies} />
    </div>
  );
}
