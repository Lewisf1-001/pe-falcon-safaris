import Link from "next/link";
import Image from "next/image";
import { fetchFeaturedDestinations } from "@/lib/destinations";

export default async function FeaturedDestinations() {
  const destinations = await fetchFeaturedDestinations();

  if (destinations.length === 0) {
    return null;
  }

  return (
    <section id="destinations" className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="mb-10">
          <h2 className="text-3xl font-bold text-forest">Featured Destinations</h2>
          <p className="mt-2 text-gray-500">Handpicked Kenya safari experiences</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {destinations.map((dest) => (
            <Link
              key={dest.id}
              href={`/destinations/${dest.slug}`}
              className="group overflow-hidden rounded-xl border border-gray-100 bg-cream shadow-sm transition-shadow hover:shadow-md"
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
                  <span className="text-4xl text-white/30">🌍</span>
                </div>
              )}

              <div className="p-5">
                <h3 className="text-lg font-bold text-forest group-hover:text-champagne-dark">
                  {dest.name}
                </h3>
                {(dest.region || dest.country) && (
                  <p className="mt-1 text-sm text-gray-500">
                    {[dest.region, dest.country].filter(Boolean).join(", ")}
                  </p>
                )}
                {dest.shortDescription && (
                  <p className="mt-2 line-clamp-2 text-sm text-gray-600">
                    {dest.shortDescription}
                  </p>
                )}
                <span className="mt-3 inline-flex items-center text-sm font-medium text-forest group-hover:text-champagne-dark">
                  Explore →
                </span>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/destinations"
            className="nav-cta inline-flex items-center justify-center rounded-sm px-6 py-3 font-display text-xs font-semibold uppercase tracking-[0.18em] text-forest transition-opacity hover:opacity-90"
          >
            View all destinations
          </Link>
        </div>
      </div>
    </section>
  );
}
