import Link from "next/link";
import Image from "next/image";
import { fetchFeaturedWildlife } from "@/lib/wildlife";

const CONSERVATION_MAP: Record<string, string> = {
  least_concern: "Least Concern",
  near_threatened: "Near Threatened",
  vulnerable: "Vulnerable",
  endangered: "Endangered",
  critically_endangered: "Critically Endangered",
  data_deficient: "Data Deficient",
};

export default async function FeaturedWildlife() {
  const species = await fetchFeaturedWildlife();

  if (species.length === 0) {
    return null;
  }

  return (
    <section id="wildlife" className="bg-cream py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="mb-10">
          <h2 className="text-3xl font-bold text-forest">Wildlife</h2>
          <p className="mt-2 text-gray-500">Discover Kenya&apos;s remarkable fauna</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
                  <span className="text-4xl text-white/30">🦁</span>
                </div>
              )}

              <div className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-lg font-bold text-forest group-hover:text-champagne-dark">
                    {sp.name}
                  </h3>
                  {sp.conservationStatus && sp.conservationStatus !== "not_evaluated" && (
                    <span className="shrink-0 rounded-full bg-champagne/20 px-2 py-0.5 text-xs font-medium text-champagne-dark">
                      {CONSERVATION_MAP[sp.conservationStatus] || sp.conservationStatus}
                    </span>
                  )}
                </div>
                {sp.scientificName && (
                  <p className="mt-1 text-xs italic text-gray-400">{sp.scientificName}</p>
                )}
                {sp.shortDescription && (
                  <p className="mt-2 line-clamp-2 text-sm text-gray-600">
                    {sp.shortDescription}
                  </p>
                )}
                <span className="mt-3 inline-flex items-center text-sm font-medium text-forest group-hover:text-champagne-dark">
                  Learn more →
                </span>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/wildlife"
            className="nav-cta inline-flex items-center justify-center rounded-sm px-6 py-3 font-display text-xs font-semibold uppercase tracking-[0.18em] text-forest transition-opacity hover:opacity-90"
          >
            Explore all wildlife
          </Link>
        </div>
      </div>
    </section>
  );
}
