import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { fetchWildlifeBySlug, fetchPublishedWildlife } from "@/lib/wildlife";

type Props = {
  params: Promise<{ slug: string }>;
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

export async function generateStaticParams() {
  const species = await fetchPublishedWildlife();
  return species.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const species = await fetchWildlifeBySlug(slug);

  if (!species) {
    return { title: "Species Not Found" };
  }

  const title = species.seoTitle || `${species.name} | PE Falcon Safaris`;
  const description =
    species.seoDescription ||
    species.shortDescription ||
    `Learn about ${species.name} in Kenya's wildlife.`;

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

export default async function WildlifeDetailPage({ params }: Props) {
  const { slug } = await params;
  const species = await fetchWildlifeBySlug(slug);

  if (!species) {
    notFound();
  }

  const conservationLabel = species.conservationStatus
    ? CONSERVATION_MAP[species.conservationStatus] || species.conservationStatus
    : null;

  return (
    <div className="mx-auto max-w-6xl px-6 py-16 lg:px-8">
      {/* Hero */}
      {species.heroImage ? (
        <div className="relative mb-8 h-72 overflow-hidden rounded-xl bg-olive sm:h-96">
          <Image
            src={species.heroImage}
            alt={species.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 896px"
            className="object-cover"
            priority
            unoptimized
          />
        </div>
      ) : (
        <div className="mb-8 flex h-72 items-center justify-center rounded-xl bg-olive sm:h-96">
          <span className="text-6xl text-white/30">🦁</span>
        </div>
      )}

      {/* Header */}
      <header className="mb-8">
        <nav className="mb-4 text-sm text-gray-500">
          <Link href="/" className="hover:text-forest">
            Home
          </Link>
          <span className="mx-2">/</span>
          <Link href="/wildlife" className="hover:text-forest">
            Wildlife
          </Link>
          <span className="mx-2">/</span>
          <span className="text-forest">{species.name}</span>
        </nav>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-forest sm:text-5xl">
              {species.name}
            </h1>
            {species.scientificName && (
              <p className="mt-2 text-lg italic text-gray-500">
                {species.scientificName}
              </p>
            )}
            {species.commonName && (
              <p className="mt-1 text-sm text-gray-400">
                Also known as: {species.commonName}
              </p>
            )}
          </div>
          {conservationLabel && (
            <span className="shrink-0 rounded-full bg-champagne/20 px-3 py-1 text-sm font-medium text-champagne-dark">
              {conservationLabel}
            </span>
          )}
        </div>
      </header>

      {/* Description */}
      {species.description && (
        <section className="mb-12">
          <div className="prose max-w-none text-gray-700">
            {species.description.split("\n").map((paragraph, i) => (
              <p key={i} className="mb-4">
                {paragraph}
              </p>
            ))}
          </div>
        </section>
      )}

      {/* Details Grid */}
      <section className="mb-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {species.habitat && (
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="mb-2 text-lg font-bold text-forest">Habitat</h3>
            <p className="text-sm text-gray-600">{species.habitat}</p>
          </div>
        )}
        {species.behavior && (
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="mb-2 text-lg font-bold text-forest">Behavior</h3>
            <p className="text-sm text-gray-600">{species.behavior}</p>
          </div>
        )}
        {species.diet && (
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="mb-2 text-lg font-bold text-forest">Diet</h3>
            <p className="text-sm text-gray-600">{species.diet}</p>
          </div>
        )}
      </section>

      {/* Safari Viewing */}
      {species.safariViewing && (
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-bold text-forest">Safari Viewing</h2>
          <div className="rounded-xl border border-gray-100 bg-cream p-6">
            <p className="text-gray-700">{species.safariViewing}</p>
          </div>
        </section>
      )}

      {/* Gallery */}
      {species.galleryImages.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-6 text-2xl font-bold text-forest">Gallery</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {species.galleryImages.map((image, index) => (
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

      {/* Related Destinations */}
      {species.destinations.length > 0 && (
        <section>
          <h2 className="mb-6 text-2xl font-bold text-forest">
            Where to see {species.name}
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {species.destinations.map((dest) => (
              <Link
                key={dest.id}
                href={`/destinations/${dest.slug}`}
                className="group overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                {dest.heroImage ? (
                  <div className="relative h-40 overflow-hidden bg-olive">
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
                  <div className="flex h-40 items-center justify-center bg-olive">
                    <span className="text-3xl text-white/30">🌍</span>
                  </div>
                )}
                <div className="p-5">
                  <h3 className="text-lg font-bold text-forest group-hover:text-champagne-dark">
                    {dest.name}
                  </h3>
                  <span className="mt-2 inline-flex items-center text-sm font-medium text-forest group-hover:text-champagne-dark">
                    Explore destination →
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
