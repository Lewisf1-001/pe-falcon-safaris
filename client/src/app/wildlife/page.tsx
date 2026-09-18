import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { fetchPublishedWildlife } from "@/lib/wildlife";

export const metadata: Metadata = {
  title: "Wildlife Explorer | PE Falcon Safaris",
  description:
    "Discover the incredible wildlife of Kenya. From the Big Five to rare species, explore our guide to Kenya's remarkable fauna.",
};

const CONSERVATION_MAP: Record<string, string> = {
  least_concern: "Least Concern",
  near_threatened: "Near Threatened",
  vulnerable: "Vulnerable",
  endangered: "Endangered",
  critically_endangered: "Critically Endangered",
  data_deficient: "Data Deficient",
  not_evaluated: "Not Evaluated",
};

export default async function WildlifePage() {
  const species = await fetchPublishedWildlife();

  return (
    <div className="mx-auto max-w-6xl px-6 py-16 lg:px-8">
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-bold text-forest sm:text-5xl">
          Wildlife Explorer
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
          Kenya is home to an extraordinary diversity of wildlife. Explore our
          guide to the species you may encounter on safari.
        </p>
      </header>

      {species.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-white p-12 text-center shadow-sm">
          <p className="text-gray-500">
            No wildlife species available at the moment. Please check back soon.
          </p>
        </div>
      ) : (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {species.map((sp) => (
            <Link
              key={sp.id}
              href={`/wildlife/${sp.slug}`}
              className="group overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md"
            >
              {sp.heroImage ? (
                <div className="relative h-56 overflow-hidden bg-olive">
                  <Image
                    src={sp.heroImage}
                    alt={sp.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="flex h-56 items-center justify-center bg-olive">
                  <span className="text-4xl text-white/40">🦁</span>
                </div>
              )}

              <div className="p-6">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-xl font-bold text-forest group-hover:text-champagne-dark">
                    {sp.name}
                  </h2>
                  {sp.conservationStatus && sp.conservationStatus !== "not_evaluated" && (
                    <span className="shrink-0 rounded-full bg-champagne/20 px-2.5 py-0.5 text-xs font-medium text-champagne-dark">
                      {CONSERVATION_MAP[sp.conservationStatus] || sp.conservationStatus}
                    </span>
                  )}
                </div>

                {sp.scientificName && (
                  <p className="mt-1 text-sm italic text-gray-500">{sp.scientificName}</p>
                )}

                {sp.shortDescription && (
                  <p className="mt-3 line-clamp-2 text-sm text-gray-600">
                    {sp.shortDescription}
                  </p>
                )}

                <span className="mt-4 inline-flex items-center text-sm font-medium text-forest group-hover:text-champagne-dark">
                  Learn more →
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
