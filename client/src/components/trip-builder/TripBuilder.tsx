"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import type { DestinationSummary } from "@/lib/destinations";
import type { SafariPackage } from "@/types/package";
import WhatsAppButton from "@/components/contact/WhatsAppButton";
import { buildTripMessage } from "@/lib/whatsapp";

type ItineraryItem = {
  destinationId: number;
  destinationName: string;
  destinationSlug: string;
  packageId: number | null;
  packageName: string | null;
  packageSlug: string | null;
  packagePriceUsd: number | null;
};

type TripBuilderProps = {
  destinations: DestinationSummary[];
  packages: SafariPackage[];
};

const STORAGE_KEY = "pe_falcon_trip_builder";

function loadItinerary(): ItineraryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item: unknown): item is ItineraryItem =>
        item != null &&
        typeof item === "object" &&
        "destinationId" in item &&
        "destinationName" in item &&
        "destinationSlug" in item
    );
  } catch {
    return [];
  }
}

function saveItinerary(items: ItineraryItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

function getPackagesForDestination(
  packages: SafariPackage[],
  destinationName: string
): SafariPackage[] {
  return packages.filter(
    (pkg) =>
      pkg.isActive &&
      pkg.destinations.some(
        (d) => d.toLowerCase() === destinationName.toLowerCase()
      )
  );
}

export default function TripBuilder({ destinations, packages }: TripBuilderProps) {
  const [itinerary, setItinerary] = useState<ItineraryItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const [selectedDestId, setSelectedDestId] = useState<number | null>(null);

  useEffect(() => {
    setItinerary(loadItinerary());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      saveItinerary(itinerary);
    }
  }, [itinerary, mounted]);

  const addToItinerary = useCallback(
    (dest: DestinationSummary) => {
      setItinerary((prev) => {
        if (prev.some((item) => item.destinationId === dest.id)) return prev;
        return [
          ...prev,
          {
            destinationId: dest.id,
            destinationName: dest.name,
            destinationSlug: dest.slug,
            packageId: null,
            packageName: null,
            packageSlug: null,
            packagePriceUsd: null,
          },
        ];
      });
      setSelectedDestId(null);
    },
    []
  );

  const removeFromItinerary = useCallback((destinationId: number) => {
    setItinerary((prev) => prev.filter((item) => item.destinationId !== destinationId));
  }, []);

  const moveUp = useCallback((index: number) => {
    if (index === 0) return;
    setItinerary((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }, []);

  const moveDown = useCallback((index: number) => {
    setItinerary((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }, []);

  const selectPackage = useCallback(
    (destinationId: number, pkg: SafariPackage | null) => {
      setItinerary((prev) =>
        prev.map((item) =>
          item.destinationId === destinationId
            ? {
                ...item,
                packageId: pkg?.id ?? null,
                packageName: pkg?.name ?? null,
                packageSlug: pkg?.slug ?? null,
                packagePriceUsd: pkg?.startingPriceUsd ?? null,
              }
            : item
        )
      );
    },
    []
  );

  const clearItinerary = useCallback(() => {
    setItinerary([]);
  }, []);

  const selectedIds = new Set(itinerary.map((item) => item.destinationId));
  const availableDestinations = destinations.filter(
    (d) => !selectedIds.has(d.id)
  );
  const totalEstimate = itinerary.reduce(
    (sum, item) => sum + (item.packagePriceUsd ?? 0),
    0
  );

  if (!mounted) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-12 text-center shadow-sm">
        <p className="text-gray-500">Loading trip builder...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-forest">
                Select Destinations
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Choose the places you want to visit on your safari.
              </p>
            </div>

            {availableDestinations.length === 0 ? (
              <div className="p-8 text-center">
                {destinations.length === 0 ? (
                  <p className="text-gray-500">
                    No destinations available at the moment.
                  </p>
                ) : (
                  <p className="text-gray-500">
                    All destinations have been added to your itinerary.
                  </p>
                )}
              </div>
            ) : (
              <div className="grid gap-4 p-6 sm:grid-cols-2">
                {availableDestinations.map((dest) => {
                  const associatedPackages = getPackagesForDestination(
                    packages,
                    dest.name
                  );
                  return (
                    <div
                      key={dest.id}
                      className={`overflow-hidden rounded-lg border transition-colors ${
                        selectedDestId === dest.id
                          ? "border-champagne bg-champagne/5"
                          : "border-gray-100 hover:border-gray-200"
                      }`}
                    >
                      {dest.heroImage ? (
                        <div className="relative h-32 overflow-hidden bg-olive">
                          <Image
                            src={dest.heroImage}
                            alt={dest.name}
                            fill
                            sizes="(max-width: 640px) 100vw, 50vw"
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div className="flex h-32 items-center justify-center bg-olive">
                          <span className="text-3xl text-white/40">🌍</span>
                        </div>
                      )}

                      <div className="p-4">
                        <h3 className="font-semibold text-forest">
                          {dest.name}
                        </h3>
                        {(dest.region || dest.country) && (
                          <p className="mt-0.5 text-xs text-gray-500">
                            {[dest.region, dest.country]
                              .filter(Boolean)
                              .join(", ")}
                          </p>
                        )}
                        {dest.shortDescription && (
                          <p className="mt-2 line-clamp-2 text-sm text-gray-600">
                            {dest.shortDescription}
                          </p>
                        )}
                        {associatedPackages.length > 0 && (
                          <p className="mt-2 text-xs text-forest/60">
                            {associatedPackages.length} package
                            {associatedPackages.length !== 1 ? "s" : ""}{" "}
                            available
                          </p>
                        )}
                        <button
                          onClick={() => addToItinerary(dest)}
                          className="mt-3 w-full rounded-lg bg-forest px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-forest-light"
                        >
                          Add to itinerary
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-6 space-y-6">
            <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                <h2 className="text-lg font-semibold text-forest">
                  Your Itinerary
                </h2>
                {itinerary.length > 0 && (
                  <button
                    onClick={clearItinerary}
                    className="text-xs text-gray-400 hover:text-red-500"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {itinerary.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-gray-500">
                    Your itinerary is empty. Add destinations from the list to
                    start planning.
                  </p>
                </div>
              ) : (
                <>
                  <ul className="divide-y divide-gray-50">
                    {itinerary.map((item, index) => {
                      const dest = destinations.find(
                        (d) => d.id === item.destinationId
                      );
                      const associatedPackages = dest
                        ? getPackagesForDestination(packages, dest.name)
                        : [];

                      return (
                        <li key={item.destinationId} className="px-6 py-4">
                          <div className="flex items-start gap-3">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-champagne/20 text-xs font-bold text-champagne-deep">
                              {index + 1}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <Link
                                  href={`/destinations/${item.destinationSlug}`}
                                  className="font-medium text-forest hover:text-champagne-deep"
                                >
                                  {item.destinationName}
                                </Link>
                              </div>

                              {associatedPackages.length > 0 && (
                                <div className="mt-2">
                                  <label className="text-xs text-gray-500">
                                    Package:
                                  </label>
                                  <select
                                    value={item.packageId ?? ""}
                                    onChange={(e) => {
                                      const pkg = e.target.value
                                        ? associatedPackages.find(
                                            (p) =>
                                              p.id === Number(e.target.value)
                                          ) ?? null
                                        : null;
                                      selectPackage(
                                        item.destinationId,
                                        pkg
                                      );
                                    }}
                                    className="mt-1 block w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs text-forest outline-none focus:border-forest focus:ring-1 focus:ring-forest/20"
                                  >
                                    <option value="">No package</option>
                                    {associatedPackages.map((pkg) => (
                                      <option key={pkg.id} value={pkg.id}>
                                        {pkg.name} — ${pkg.startingPriceUsd}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}

                              {item.packageName && (
                                <p className="mt-1 text-xs text-gray-500">
                                  {item.packageName}
                                  {item.packagePriceUsd != null && (
                                    <span className="ml-1">
                                      — ${item.packagePriceUsd}
                                    </span>
                                  )}
                                </p>
                              )}
                            </div>

                            <div className="flex shrink-0 flex-col gap-1">
                              <button
                                onClick={() => moveUp(index)}
                                disabled={index === 0}
                                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-forest disabled:opacity-30"
                                aria-label={`Move ${item.destinationName} up`}
                              >
                                ↑
                              </button>
                              <button
                                onClick={() => moveDown(index)}
                                disabled={index === itinerary.length - 1}
                                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-forest disabled:opacity-30"
                                aria-label={`Move ${item.destinationName} down`}
                              >
                                ↓
                              </button>
                              <button
                                onClick={() =>
                                  removeFromItinerary(item.destinationId)
                                }
                                className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                                aria-label={`Remove ${item.destinationName}`}
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="border-t border-gray-100 px-6 py-4">
                    {totalEstimate > 0 && (
                      <div className="mb-3 flex items-center justify-between text-sm">
                        <span className="text-gray-500">
                          Estimated total
                        </span>
                        <span className="font-semibold text-forest">
                          ${totalEstimate.toLocaleString()} USD
                        </span>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Link
                        href="/destinations"
                        className="block w-full rounded-lg border border-gray-200 px-4 py-2.5 text-center text-sm font-medium text-forest transition-colors hover:bg-gray-50"
                      >
                        Browse destinations
                      </Link>
                      <Link
                        href="/packages"
                        className="block w-full rounded-lg border border-gray-200 px-4 py-2.5 text-center text-sm font-medium text-forest transition-colors hover:bg-gray-50"
                      >
                        Browse packages
                      </Link>
                      <Link
                        href="/contact"
                        className="block w-full rounded-lg border border-gray-200 px-4 py-2.5 text-center text-sm font-medium text-forest transition-colors hover:bg-gray-50"
                      >
                        Send inquiry
                      </Link>
                      <WhatsAppButton
                        message={buildTripMessage(
                          itinerary.map((item) => ({
                            destinationName: item.destinationName,
                            packageName: item.packageName,
                            packagePriceUsd: item.packagePriceUsd,
                          })),
                          totalEstimate
                        )}
                        label="Ask About This Trip on WhatsApp"
                        className="w-full justify-center"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
