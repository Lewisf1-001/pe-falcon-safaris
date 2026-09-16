"use client";

import { useCallback, useEffect, useState } from "react";
import { callEdgeFunction } from "@/lib/api";
import type { Destination, DestinationStatus } from "@/types/destination";

type DestinationsListProps = {
  onEdit: (dest: Destination) => void;
  reloadKey: number;
};

const statusStyles: Record<DestinationStatus, string> = {
  draft: "bg-gray-100 text-gray-600",
  published: "bg-green-100 text-green-700",
  archived: "bg-orange-100 text-orange-700",
};

function mapRowToDestination(row: any): Destination {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    country: row.country,
    region: row.region,
    shortDescription: row.short_description,
    description: row.description,
    status: row.status,
    featured: row.featured,
    heroImage: row.hero_image,
    galleryImages: row.gallery_images || [],
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    sortOrder: row.sort_order,
    packageCount: row.packageCount,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export default function DestinationsList({ onEdit, reloadKey }: DestinationsListProps) {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const loadDestinations = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const data = await callEdgeFunction<{ destinations: any[] }>("destinations/admin");
      setDestinations((data.destinations || []).map(mapRowToDestination));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load destinations.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDestinations();
  }, [loadDestinations, reloadKey]);

  async function handleDelete(destId: number, name: string) {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) {
      return;
    }

    setMessage("");
    setError("");

    try {
      await callEdgeFunction("destinations/admin/" + destId, { method: "DELETE" });
      setMessage("Destination deleted successfully.");
      await loadDestinations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete destination.");
    }
  }

  const filtered =
    filterStatus === "all"
      ? destinations
      : destinations.filter((d) => d.status === filterStatus);

  const statusCounts = destinations.reduce(
    (acc, d) => {
      acc[d.status] = (acc[d.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  if (isLoading) {
    return <p className="text-sm text-gray-500">Loading destinations...</p>;
  }

  return (
    <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-forest">All destinations</h2>

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {message && (
        <p className="mt-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilterStatus("all")}
          className={`rounded-md px-3 py-1.5 text-xs font-medium ${
            filterStatus === "all"
              ? "bg-forest text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          All ({destinations.length})
        </button>
        {Object.entries(statusCounts).map(([status, count]) => (
          <button
            key={status}
            type="button"
            onClick={() => setFilterStatus(status)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize ${
              filterStatus === status
                ? "bg-forest text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {status} ({count})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">No destinations found.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-gray-500">
                <th className="px-2 py-3 font-medium">Destination</th>
                <th className="px-2 py-3 font-medium">Location</th>
                <th className="px-2 py-3 font-medium">Packages</th>
                <th className="px-2 py-3 font-medium">Status</th>
                <th className="px-2 py-3 font-medium">Featured</th>
                <th className="px-2 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((dest) => (
                <tr key={dest.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-2 py-4">
                    <p className="font-medium text-forest">{dest.name}</p>
                    <p className="text-xs text-gray-500">/{dest.slug}</p>
                  </td>
                  <td className="px-2 py-4 text-gray-600">
                    {[dest.region, dest.country].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="px-2 py-4 text-gray-600">{dest.packageCount ?? 0}</td>
                  <td className="px-2 py-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize ${statusStyles[dest.status]}`}
                    >
                      {dest.status}
                    </span>
                  </td>
                  <td className="px-2 py-4 text-gray-600">
                    {dest.featured ? "Yes" : "No"}
                  </td>
                  <td className="px-2 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onEdit(dest)}
                        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-forest transition-colors hover:border-forest"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(dest.id, dest.name)}
                        className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-50"
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
