"use client";

import { useCallback, useEffect, useState } from "react";
import { callEdgeFunction } from "@/lib/api";
import { JournalArticle, CATEGORY_OPTIONS, STATUS_OPTIONS } from "@/types/journal";

type JournalListProps = {
  reloadKey: number;
  onEdit: (article: JournalArticle) => void;
};

export default function JournalList({ reloadKey, onEdit }: JournalListProps) {
  const [articles, setArticles] = useState<JournalArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchFilter, setSearchFilter] = useState("");

  const loadArticles = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (searchFilter) params.set("search", searchFilter);

      const qs = params.toString();
      const endpoint = `journal/admin${qs ? "?" + qs : ""}`;
      const data = await callEdgeFunction<{ articles: JournalArticle[] }>(endpoint);
      setArticles(data.articles || []);
    } catch {
      setArticles([]);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, searchFilter]);

  useEffect(() => {
    loadArticles();
  }, [loadArticles, reloadKey]);

  function getCategoryLabel(value: string) {
    return CATEGORY_OPTIONS.find((o) => o.value === value)?.label || value;
  }

  function getStatusBadgeColor(status: string) {
    switch (status) {
      case "published":
        return "bg-green-100 text-green-800";
      case "draft":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-600";
    }
  }

  async function handleDelete(id: number, title: string) {
    if (!confirm(`Delete "${title}"? This action cannot be undone.`)) return;

    try {
      await callEdgeFunction(`journal/admin/${id}`, { method: "DELETE" });
      await loadArticles();
    } catch {
      // Error handling
    }
  }

  return (
    <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-forest">Journal articles ({articles.length})</h2>
        <div className="flex gap-2">
          <input
            placeholder="Search articles..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <p className="mt-4 text-sm text-gray-500">Loading articles...</p>
      ) : articles.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">
          No articles found. {statusFilter ? "Try a different filter." : "Create your first article above."}
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500">
                <th className="pb-2 pr-4">Title</th>
                <th className="pb-2 pr-4">Category</th>
                <th className="pb-2 pr-4">Status</th>
                <th className="pb-2 pr-4">Featured</th>
                <th className="pb-2 pr-4">Date</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {articles.map((article) => (
                <tr key={article.id} className="border-b border-gray-50">
                  <td className="py-3 pr-4">
                    <div className="font-medium text-forest">{article.title}</div>
                    {article.author && (
                      <div className="text-xs text-gray-400">{article.author}</div>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-gray-600">
                    {getCategoryLabel(article.category)}
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${getStatusBadgeColor(article.status)}`}>
                      {article.status}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    {article.featured ? (
                      <span className="text-champagne-dark">★</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-gray-500">
                    {article.created_at
                      ? new Date(article.created_at).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="py-3">
                    <div className="flex gap-3">
                      <button
                        onClick={() => onEdit(article)}
                        className="text-sm text-forest hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(article.id, article.title)}
                        className="text-sm text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
