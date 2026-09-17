"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import type { DestinationSummary } from "@/lib/destinations";
import "leaflet/dist/leaflet.css";

type SafariMapProps = {
  plottable: DestinationSummary[];
  unplottable: DestinationSummary[];
};

function isValidCoord(lat: number | null, lng: number | null): boolean {
  return (
    lat != null &&
    lng != null &&
    typeof lat === "number" &&
    typeof lng === "number" &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

function FitBounds({
  destinations,
  mapRef,
}: {
  destinations: DestinationSummary[];
  mapRef: React.RefObject<L.Map | null>;
}) {
  useEffect(() => {
    if (!mapRef.current || destinations.length === 0) return;
    const L = require("leaflet");
    const bounds = L.latLngBounds(
      destinations.map((d) => [d.latitude!, d.longitude!])
    );
    mapRef.current.fitBounds(bounds, { padding: [40, 40] });
  }, [destinations, mapRef]);
  return null;
}

export default function SafariMap({ plottable, unplottable }: SafariMapProps) {
  const [selected, setSelected] = useState<DestinationSummary | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (!mapRef.current || mapReady) return;

    try {
      const L = require("leaflet");

      delete (L.Icon.Default.prototype as Record<string, unknown>)
        ._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current, {
        center: [-1.2921, 36.8219],
        zoom: 6,
        scrollWheelZoom: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
      }).addTo(map);

      leafletMapRef.current = map;
      setMapReady(true);

      return () => {
        map.remove();
        leafletMapRef.current = null;
      };
    } catch {
      setMapError(true);
    }
  }, [mapReady]);

  useEffect(() => {
    if (!mapReady || !leafletMapRef.current) return;

    const L = require("leaflet");
    const map = leafletMapRef.current;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const selectedIcon = L.divIcon({
      className: "custom-marker-selected",
      html: '<div style="width:24px;height:24px;background:#f0d78c;border:3px solid #111111;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    const defaultIcon = L.divIcon({
      className: "custom-marker-default",
      html: '<div style="width:18px;height:18px;background:#111111;border:2px solid #ffffff;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });

    plottable.forEach((dest) => {
      if (!isValidCoord(dest.latitude, dest.longitude)) return;

      const isSelected = selected?.id === dest.id;
      const marker = L.marker([dest.latitude!, dest.longitude!], {
        icon: isSelected ? selectedIcon : defaultIcon,
      }).addTo(map);

      marker.on("click", () => {
        setSelected(dest);
      });

      marker.bindTooltip(dest.name, {
        direction: "top",
        offset: [0, -10],
        className: "dest-tooltip",
      });

      markersRef.current.push(marker);
    });

    if (plottable.length > 0 && !selected) {
      const bounds = L.latLngBounds(
        plottable
          .filter((d) => isValidCoord(d.latitude, d.longitude))
          .map((d) => [d.latitude!, d.longitude!])
      );
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [mapReady, plottable, selected]);

  function handleSelect(dest: DestinationSummary) {
    setSelected(dest);
    if (mapReady && leafletMapRef.current && isValidCoord(dest.latitude, dest.longitude)) {
      leafletMapRef.current.setView([dest.latitude!, dest.longitude!], 10);
    }
  }

  function handleFitAll() {
    setSelected(null);
    if (mapReady && leafletMapRef.current && plottable.length > 0) {
      const L = require("leaflet");
      const bounds = L.latLngBounds(
        plottable
          .filter((d) => isValidCoord(d.latitude, d.longitude))
          .map((d) => [d.latitude!, d.longitude!])
      );
      leafletMapRef.current.fitBounds(bounds, { padding: [40, 40] });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex-1">
          {mapError ? (
            <div className="flex h-[400px] items-center justify-center rounded-xl border border-gray-100 bg-white shadow-sm">
              <div className="text-center">
                <p className="text-gray-500">
                  The map could not be loaded. Please view the destination list
                  below.
                </p>
              </div>
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-xl border border-gray-100 shadow-sm">
              <div ref={mapRef} className="h-[400px] w-full lg:h-[500px]" />

              {!mapReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-white">
                  <p className="text-gray-500">Loading map...</p>
                </div>
              )}

              {plottable.length > 0 && (
                <button
                  onClick={handleFitAll}
                  className="absolute right-3 top-3 z-[1000] rounded-lg bg-white px-3 py-2 text-xs font-medium text-forest shadow-md hover:bg-gray-50"
                  aria-label="Fit all destinations"
                >
                  Fit all
                </button>
              )}
            </div>
          )}
        </div>

        <div className="w-full lg:w-80">
          <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-forest">
                Destinations
                {plottable.length > 0 && (
                  <span className="ml-1 text-gray-400">
                    ({plottable.length} on map)
                  </span>
                )}
              </h2>
            </div>

            <div className="max-h-[300px] overflow-y-auto lg:max-h-[450px]">
              {plottable.length === 0 && unplottable.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  No destinations available.
                </div>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {plottable.map((dest) => (
                    <li key={dest.id}>
                      <button
                        onClick={() => handleSelect(dest)}
                        className={`w-full px-4 py-3 text-left transition-colors hover:bg-gray-50 ${
                          selected?.id === dest.id ? "bg-champagne/10" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {dest.heroImage ? (
                            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-olive">
                              <Image
                                src={dest.heroImage}
                                alt={dest.name}
                                fill
                                sizes="40px"
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                          ) : (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-olive text-sm text-white/40">
                              🌍
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-forest">
                              {dest.name}
                            </p>
                            {(dest.region || dest.country) && (
                              <p className="truncate text-xs text-gray-500">
                                {[dest.region, dest.country]
                                  .filter(Boolean)
                                  .join(", ")}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {selected && (
              <div className="border-t border-gray-100 p-4">
                <h3 className="font-semibold text-forest">{selected.name}</h3>
                {(selected.region || selected.country) && (
                  <p className="mt-1 text-sm text-gray-500">
                    {[selected.region, selected.country]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                )}
                {selected.shortDescription && (
                  <p className="mt-2 line-clamp-2 text-sm text-gray-600">
                    {selected.shortDescription}
                  </p>
                )}
                <Link
                  href={`/destinations/${selected.slug}`}
                  className="mt-3 inline-flex items-center text-sm font-medium text-forest hover:text-champagne-deep"
                >
                  View details →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {unplottable.length > 0 && (
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-forest">
            More destinations
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Some destinations are not yet available on the map.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {unplottable.map((dest) => (
              <Link
                key={dest.id}
                href={`/destinations/${dest.slug}`}
                className="group flex items-center gap-3 rounded-lg border border-gray-100 p-3 transition-colors hover:bg-gray-50"
              >
                {dest.heroImage ? (
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-olive">
                    <Image
                      src={dest.heroImage}
                      alt={dest.name}
                      fill
                      sizes="40px"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-olive text-sm text-white/40">
                    🌍
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-forest group-hover:text-champagne-deep">
                    {dest.name}
                  </p>
                  {(dest.region || dest.country) && (
                    <p className="truncate text-xs text-gray-500">
                      {[dest.region, dest.country].filter(Boolean).join(", ")}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
