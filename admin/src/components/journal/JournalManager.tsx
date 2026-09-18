"use client";

import { useState } from "react";
import { JournalArticle } from "@/types/journal";
import JournalForm from "@/components/journal/JournalForm";
import JournalList from "@/components/journal/JournalList";

export default function JournalManager() {
  const [reloadKey, setReloadKey] = useState(0);
  const [editingArticle, setEditingArticle] = useState<JournalArticle | null>(null);

  function handleSaved() {
    setReloadKey((k) => k + 1);
    setEditingArticle(null);
  }

  return (
    <div className="space-y-8">
      <JournalForm
        editingArticle={editingArticle}
        onSaved={handleSaved}
        onCancelEdit={() => setEditingArticle(null)}
      />
      <JournalList reloadKey={reloadKey} onEdit={setEditingArticle} />
    </div>
  );
}
