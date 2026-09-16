import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { fetchDestinationBySlug, fetchPublishedDestinations } from "@/lib/destinations";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const destinations = await fetchPublishedDestinations();
  return destinations.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const destination = await fetchDestinationBySlug(slug);

  if (!destination) {
    return { title: "Destination Not Found" };
  }

  const title = destination.seoTitle || `${destination.name} | PE Falcon Safaris`;
  const description =
    destination.seoDescription ||
    destination.shortDescription ||
    `Explore ${destination.name} safari destination in ${[destination.region, destination.country].filter(Boolean).join(", ")}.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
  };
}

export default async function DestinationDetailPage({ params }: Props) {
  const { slug } = await params;
  const destination = await fetchDestinationBySlug(slug);

  if (!destination) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-16 lg:px-8">
      {/* Hero */}
      {destination.heroImage ? (
        <div className="relative mb-8 h-72 overflow-hidden rounded-xl bg-olive sm:h-96">
          <Image
            src={destination.heroImage}
            alt={destination.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 896px"
            className="object-cover"
            priority
            unoptimized
          />
        </div>
      ) : (
        <div className="mb-8 flex h-72 items-center justify-center rounded-xl bg-olive sm:h-96">
          <span className="text-6xl text-white/30">🌍</span>
        </div>
      )}

      {/* Header */}
      <header className="mb-8">
        <nav className="mb-4 text-sm text-gray-500">
          <Link href="/" className="hover:text-forest">
            Home
          </Link>
          <span className="mx-2">/</span>
          <Link href="/destinations" className="hover:text-forest">
            Destinations
          </Link>
          <span className="mx-2">/</span>
          <span className="text-forest">{destination.name}</span>
        </nav>

        <h1 className="text-4xl font-bold text-forest sm:text-5xl">
          {destination.name}
        </h1>

        {(destination.region || destination.country) && (
          <p className="mt-3 text-lg text-gray-600">
            {[destination.region, destination.country].filter(Boolean).join(", ")}
          </p>
        )}
      </header>

      {/* Description */}
      {destination.description && (
        <section className="mb-12">
          <div className="prose max-w-none text-gray-700">
            {destination.description.split("\n").map((paragraph, i) => (
              <p key={i} className="mb-4">
                {paragraph}
              </p>
            ))}
          </div>
        </section>
      )}

      {/* Gallery */}
      {destination.galleryImages.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-6 text-2xl font-bold text-forest">Gallery</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {destination.galleryImages.map((image, index) => (
              <div
                key={`${image.url}-${index}`}
                className="relative aspect-[4/3] overflow-hidden rounded-lg bg-olive"
              >
                <Image
                  src={image.url}
                  alt={image.alt}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover"
                  unoptimized
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Related Packages */}
      {destination.packages.length > 0 && (
        <section>
          <h2 className="mb-6 text-2xl font-bold text-forest">
            Safari Packages in {destination.name}
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {destination.packages.map((pkg) => (
              <Link
                key={pkg.id}
                href={`/packages/${pkg.slug}`}
                className="group overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                {pkg.galleryImages && pkg.galleryImages.length > 0 ? (
                  <div className="relative h-48 overflow-hidden bg-olive">
                    <Image
                      src={pkg.galleryImages[0].url}
                      alt={pkg.galleryImages[0].alt || pkg.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="flex h-48 items-center justify-center bg-olive">
                    <span className="text-3xl text-white/30">🦁</span>
                  </div>
                )}

                <div className="p-5">
                  <h3 className="text-lg font-bold text-forest group-hover:text-champagne-dark">
                    {pkg.name}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">{pkg.duration}</p>
                  {pkg.idealFor && (
                    <p className="mt-1 text-xs text-gray-400">
                      Ideal for: {pkg.idealFor}
                    </p>
                  )}
                  <p className="mt-3 text-lg font-semibold text-forest">
                    From USD {pkg.startingPriceUsd.toLocaleString()}
                  </p>
                  <span className="mt-3 inline-flex items-center text-sm font-medium text-forest group-hover:text-champagne-dark">
                    View package →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
