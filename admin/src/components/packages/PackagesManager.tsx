"use client";

import { useState } from "react";
import PackageForm from "@/components/packages/PackageForm";
import PackagesList from "@/components/packages/PackagesList";
import type { SafariPackage } from "@/types/package";

export default function PackagesManager() {
  const [reloadKey, setReloadKey] = useState(0);
  const [editingPackage, setEditingPackage] = useState<SafariPackage | null>(null);

  return (
    <div className="space-y-8">
      <PackageForm
        editingPackage={editingPackage}
        onSaved={() => setReloadKey((current) => current + 1)}
        onCancelEdit={() => setEditingPackage(null)}
      />
      <PackagesList
        reloadKey={reloadKey}
        onEdit={(pkg) => {
          setEditingPackage(pkg);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />
    </div>
  );
}
