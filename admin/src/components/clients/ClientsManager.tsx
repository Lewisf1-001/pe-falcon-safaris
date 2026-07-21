"use client";

import { useState } from "react";
import ClientsList from "@/components/clients/ClientsList";
import ClientDetailPanel from "@/components/clients/ClientDetailPanel";

export default function ClientsManager() {
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);

  return (
    <div className="space-y-8">
      <ClientsList
        reloadKey={reloadKey}
        selectedClientId={selectedClientId}
        onSelectClient={setSelectedClientId}
      />

      {selectedClientId != null && (
        <ClientDetailPanel
          clientId={selectedClientId}
          onUpdated={() => setReloadKey((current) => current + 1)}
          onClose={() => setSelectedClientId(null)}
        />
      )}
    </div>
  );
}
