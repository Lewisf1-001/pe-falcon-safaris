import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import SafariPackages from "@/components/home/SafariPackages";
import { fetchPackages } from "@/lib/packages";

export default async function PackagesPage() {
  const packages = await fetchPackages();

  return (
    <>
      <Navbar />
      <main className="bg-cream py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <Link href="/" className="text-sm font-medium text-forest hover:underline">
            ← Back to home
          </Link>
          <header className="mt-6 mb-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Explore</p>
            <h1 className="mt-2 text-3xl font-bold text-forest sm:text-4xl">Safari Packages</h1>
            <p className="mt-3 max-w-2xl text-gray-600">
              Browse our handpicked Kenya safari experiences with destination photos, pricing, and
              full itineraries.
            </p>
          </header>
        </div>

        <SafariPackages packages={packages} />
      </main>
      <Footer />
    </>
  );
}
