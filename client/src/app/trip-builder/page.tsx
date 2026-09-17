import type { Metadata } from "next";
import { fetchPublishedDestinations } from "@/lib/destinations";
import { fetchPackages } from "@/lib/packages";
import TripBuilder from "@/components/trip-builder/TripBuilder";

export const metadata: Metadata = {
  title: "Safari Trip Builder | PE Falcon Safaris",
  description:
    "Plan your perfect safari itinerary. Select destinations, choose packages, and build a customized Kenya safari experience.",
};

export default async function TripBuilderPage() {
  const [destinations, packages] = await Promise.all([
    fetchPublishedDestinations(),
    fetchPackages(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-16 lg:px-8">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-forest sm:text-5xl">
          Safari Trip Builder
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
          Plan your perfect safari by selecting destinations and packages.
          Build a customized itinerary for your Kenya adventure.
        </p>
      </header>

      <TripBuilder destinations={destinations} packages={packages} />
    </div>
  );
}
