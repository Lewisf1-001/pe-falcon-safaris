"use client";

import { useCallback, useEffect, useState } from "react";
import { callEdgeFunction } from "@/lib/api";
import { WildlifeSpecies, STATUS_OPTIONS, CONSERVATION_OPTIONS } from "@/types/wildlife";

type WildlifeListProps = {
  reloadKey: number;
  onEdit: (species: WildlifeSpecies) => void;
};

export default function WildlifeList({ reloadKey, onEdit }: WildlifeListProps) {
  const [species, setSpecies] = useState<WildlifeSpecies[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchFilter, setSearchFilter] = useState("");

  const loadSpecies = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (searchFilter) params.set("search", searchFilter);

      const qs = params.toString();
      const endpoint = `wildlife/admin${qs ? "?" + qs : ""}`;
      const data = await callEdgeFunction<{ species: WildlifeSpecies[] }>(endpoint);
      setSpecies(data.species || []);
    } catch {
      setSpecies([]);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, searchFilter]);

  useEffect(() => {
    loadSpecies();
  }, [loadSpecies, reloadKey]);

  function getConservationLabel(value: string | null) {
    if (!value) return "—";
    return CONSERVATION_OPTIONS.find((o) => o.value === value)?.label || value;
  }

  function getStatusBadgeColor(status: string) {
    switch (status) {
      case "published":
        return "bg-green-100 text-green-800";
      case "draft":
        return "bg-yellow-100 text-yellow-800";
      case "archived":
        return "bg-gray-100 text-gray-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  }

  return (
    <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-forest">Wildlife species ({species.length})</h2>
        <div className="flex gap-2">
          <input
            placeholder="Search species..."
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
        <p className="mt-4 text-sm text-gray-500">Loading species...</p>
      ) : species.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">
          No species found. {statusFilter ? "Try a different filter." : "Create your first species above."}
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500">
                <th className="pb-2 pr-4">Name</th>
                <th className="pb-2 pr-4">Scientific name</th>
                <th className="pb-2 pr-4">Conservation</th>
                <th className="pb-2 pr-4">Status</th>
                <th className="pb-2 pr-4">Featured</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {species.map((sp) => (
                <tr key={sp.id} className="border-b border-gray-50">
                  <td className="py-3 pr-4">
                    <div className="font-medium text-forest">{sp.name}</div>
                    {sp.commonName && (
                      <div className="text-xs text-gray-400">{sp.commonName}</div>
                    )}
                  </td>
                  <td className="py-3 pr-4 italic text-gray-500">
                    {sp.scientificName || "—"}
                  </td>
                  <td className="py-3 pr-4 text-gray-600">
                    {getConservationLabel(sp.conservationStatus)}
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${getStatusBadgeColor(sp.status)}`}>
                      {sp.status}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    {sp.featured ? (
                      <span className="text-champagne-dark">★</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="py-3">
                    <button
                      onClick={() => onEdit(sp)}
                      className="text-sm text-forest hover:underline"
                    >
                      Edit
                    </button>
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
