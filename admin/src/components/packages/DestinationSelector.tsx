"use client";

import { useCallback, useEffect, useState } from "react";
import { callEdgeFunction } from "@/lib/api";

type DestinationOption = {
  id: number;
  name: string;
  slug: string;
  country: string | null;
  region: string | null;
};

type DestinationSelectorProps = {
  selectedDestinationIds: number[];
  onChange: (ids: number[]) => void;
};

export default function DestinationSelector({
  selectedDestinationIds,
  onChange,
}: DestinationSelectorProps) {
  const [destinations, setDestinations] = useState<DestinationOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDestinations = useCallback(async () => {
    try {
      const data = await callEdgeFunction<{ destinations: any[] }>("destinations/admin");
      setDestinations(
        (data.destinations || []).map((d) => ({
          id: d.id,
          name: d.name,
          slug: d.slug,
          country: d.country,
          region: d.region,
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load destinations.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDestinations();
  }, [loadDestinations]);

  function toggleDestination(destId: number) {
    if (selectedDestinationIds.includes(destId)) {
      onChange(selectedDestinationIds.filter((id) => id !== destId));
    } else {
      onChange([...selectedDestinationIds, destId]);
    }
  }

  if (isLoading) {
    return (
      <div>
        <p className="mb-1.5 text-sm font-medium text-forest">Destinations</p>
        <p className="text-xs text-gray-500">Loading destinations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <p className="mb-1.5 text-sm font-medium text-forest">Destinations</p>
        <p className="text-xs text-red-600">{error}</p>
      </div>
    );
  }

  if (destinations.length === 0) {
    return (
      <div>
        <p className="mb-1.5 text-sm font-medium text-forest">Destinations</p>
        <p className="text-xs text-gray-500">
          No destinations created yet. Create destinations in the{" "}
          <a href="/destinations" className="underline hover:text-forest">
            Destinations
          </a>{" "}
          section first.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-forest">Destinations</p>
      <p className="mb-2 text-xs text-gray-500">
        Select which destinations this package belongs to.
      </p>
      <div className="max-h-48 overflow-y-auto rounded-md border border-gray-200 p-3 space-y-2">
        {destinations.map((dest) => (
          <label
            key={dest.id}
            className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selectedDestinationIds.includes(dest.id)}
              onChange={() => toggleDestination(dest.id)}
              className="mt-0.5 rounded border-gray-300 text-forest focus:ring-forest/20"
            />
            <span>
              {dest.name}
              {(dest.region || dest.country) && (
                <span className="text-xs text-gray-400">
                  {" "}
                  — {[dest.region, dest.country].filter(Boolean).join(", ")}
                </span>
              )}
            </span>
          </label>
        ))}
      </div>
      {selectedDestinationIds.length > 0 && (
        <p className="mt-1.5 text-xs text-gray-500">
          {selectedDestinationIds.length} destination(s) selected
        </p>
      )}
    </div>
  );
}
