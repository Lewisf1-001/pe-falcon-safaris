import Link from "next/link";
import { notFound } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PackageGallery from "@/components/packages/PackageGallery";
import BookSafariButton from "@/components/booking/BookSafariButton";
import FormattedPrice from "@/components/currency/FormattedPrice";
import { fetchPackageBySlug } from "@/lib/packages";

type PackageDetailPageProps = {
  params: Promise<{ slug: string }>;
};

function PackageList({ title, items }: { title: string; items: string[] }) {
  return (
    <section>
      <h2 className="text-xl font-bold text-forest">{title}</h2>
      <ul className="mt-4 space-y-2">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-sm text-gray-600">
            <span className="text-gold">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function PackageDetailPage({ params }: PackageDetailPageProps) {
  const { slug } = await params;
  const safariPackage = await fetchPackageBySlug(slug);

  if (!safariPackage) {
    notFound();
  }

  return (
    <>
      <Navbar />
      <main className="bg-cream py-12 sm:py-16">
        <div className="mx-auto max-w-4xl px-6">
          <Link href="/packages" className="text-sm font-medium text-forest hover:underline">
            ← Back to packages
          </Link>

          <div className="mt-6 overflow-hidden rounded-xl bg-white shadow-lg">
            <PackageGallery
              images={safariPackage.galleryImages ?? []}
              packageName={safariPackage.name}
            />

            <div className="p-8 sm:p-10">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Safari Package</p>
              <h1 className="mt-2 text-3xl font-bold text-forest">{safariPackage.name}</h1>
              <p className="mt-2 text-gray-500">{safariPackage.duration}</p>

              {safariPackage.idealFor && (
                <p className="mt-4 text-sm text-gray-600">
                  <span className="font-medium text-forest">Ideal for:</span> {safariPackage.idealFor}
                </p>
              )}

              <div className="mt-8 grid gap-8 md:grid-cols-2">
                <PackageList title="Destinations" items={safariPackage.destinations} />
                <PackageList title="Highlights" items={safariPackage.highlights} />
              </div>

              <div className="mt-8">
                <PackageList title="Includes" items={safariPackage.includes} />
              </div>

              <div className="mt-10 flex flex-col gap-4 border-t border-gray-100 pt-8 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-500">Starting from</p>
                  <p className="text-3xl font-bold text-gold">
                    <FormattedPrice
                      amount={safariPackage.startingPrice}
                      fromCurrency={safariPackage.priceCurrency}
                    />
                  </p>
                  {safariPackage.priceNote && (
                    <p className="mt-1 text-sm text-gray-500">per person ({safariPackage.priceNote})</p>
                  )}
                </div>
                <BookSafariButton slug={safariPackage.slug} />
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
