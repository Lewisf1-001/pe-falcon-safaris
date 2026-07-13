import Link from "next/link";
import { notFound } from "next/navigation";
import BookSafariForm from "@/components/booking/BookSafariForm";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { fetchPackageBySlug } from "@/lib/packages";

type BookPackagePageProps = {
  params: Promise<{ slug: string }>;
};

export default async function BookPackagePage({ params }: BookPackagePageProps) {
  const { slug } = await params;
  const safariPackage = await fetchPackageBySlug(slug);

  if (!safariPackage) {
    notFound();
  }

  return (
    <>
      <Navbar />
      <main className="hero-stripes min-h-[calc(100vh-64px)] py-12 sm:py-16">
        <div className="mx-auto w-full max-w-lg px-6">
          <div className="rounded-xl bg-white p-8 shadow-lg sm:p-10">
            <div className="mb-8 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
                Reservation
              </p>
              <h1 className="mt-2 text-3xl font-bold text-forest">Book this safari</h1>
              <p className="mt-2 text-sm text-gray-500">
                Submit your preferred dates and we will email you a confirmation.
              </p>
            </div>

            <BookSafariForm safariPackage={safariPackage} />
          </div>

          <p className="mt-6 text-center text-sm text-gray-500">
            <Link href={`/packages/${safariPackage.slug}`} className="font-medium text-forest hover:underline">
              Back to package details
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
