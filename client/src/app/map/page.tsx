import type { Metadata } from "next";
import { fetchPublishedDestinations } from "@/lib/destinations";
import SafariMap from "@/components/map/SafariMap";

export const metadata: Metadata = {
  title: "Safari Map | PE Falcon Safaris",
  description:
    "Explore our safari destinations across Kenya on an interactive map. Find the perfect location for your next wildlife adventure.",
};

export default async function MapPage() {
  const destinations = await fetchPublishedDestinations();

  const plottable = destinations.filter(
    (d) =>
      d.latitude != null &&
      d.longitude != null &&
      typeof d.latitude === "number" &&
      typeof d.longitude === "number" &&
      d.latitude >= -90 &&
      d.latitude <= 90 &&
      d.longitude >= -180 &&
      d.longitude <= 180
  );

  const unplottable = destinations.filter(
    (d) => !plottable.some((p) => p.id === d.id)
  );

  return (
    <div className="mx-auto max-w-6xl px-6 py-16 lg:px-8">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-forest sm:text-5xl">
          Safari Map
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
          Explore our safari destinations across Kenya. Select a destination on
          the map to learn more.
        </p>
      </header>

      <SafariMap plottable={plottable} unplottable={unplottable} />
    </div>
  );
}
