import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { fetchPublishedDestinations } from "@/lib/destinations";

export const metadata: Metadata = {
  title: "Safari Destinations | PE Falcon Safaris",
  description:
    "Explore our curated safari destinations across Kenya. From the iconic Maasai Mara to the elephant herds of Amboseli, discover your perfect safari experience.",
};

export default async function DestinationsPage() {
  const destinations = await fetchPublishedDestinations();

  return (
    <div className="mx-auto max-w-6xl px-6 py-16 lg:px-8">
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-bold text-forest sm:text-5xl">
          Safari Destinations
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
          Discover the breathtaking landscapes and wildlife-rich regions of Kenya.
          Each destination offers a unique safari experience.
        </p>
      </header>

      {destinations.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-white p-12 text-center shadow-sm">
          <p className="text-gray-500">
            No destinations available at the moment. Please check back soon.
          </p>
        </div>
      ) : (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {destinations.map((dest) => (
            <Link
              key={dest.id}
              href={`/destinations/${dest.slug}`}
              className="group overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md"
            >
              {dest.heroImage ? (
                <div className="relative h-56 overflow-hidden bg-olive">
                  <Image
                    src={dest.heroImage}
                    alt={dest.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="flex h-56 items-center justify-center bg-olive">
                  <span className="text-4xl text-white/40">🌍</span>
                </div>
              )}

              <div className="p-6">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-xl font-bold text-forest group-hover:text-champagne-dark">
                    {dest.name}
                  </h2>
                  {dest.featured && (
                    <span className="shrink-0 rounded-full bg-champagne/20 px-2.5 py-0.5 text-xs font-medium text-champagne-dark">
                      Featured
                    </span>
                  )}
                </div>

                {(dest.region || dest.country) && (
                  <p className="mt-1 text-sm text-gray-500">
                    {[dest.region, dest.country].filter(Boolean).join(", ")}
                  </p>
                )}

                {dest.shortDescription && (
                  <p className="mt-3 line-clamp-2 text-sm text-gray-600">
                    {dest.shortDescription}
                  </p>
                )}

                <span className="mt-4 inline-flex items-center text-sm font-medium text-forest group-hover:text-champagne-dark">
                  Explore destination →
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
