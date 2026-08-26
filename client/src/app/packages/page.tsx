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
      <main className="packages-page-bg py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <Link
            href="/"
            className="text-sm font-medium text-champagne transition-colors hover:text-champagne-deep"
          >
            ← Back to home
          </Link>
          <header className="mt-6 mb-2">
            <p className="font-calligraphy text-2xl text-champagne sm:text-3xl">Explore</p>
            <h1 className="font-outfit mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Safari Packages
            </h1>
            <p className="mt-3 max-w-2xl font-medium text-white/80">
              Browse our handpicked Kenya safari experiences with destination photos, pricing, and
              full itineraries.
            </p>
          </header>
        </div>

        <SafariPackages packages={packages} surface="dark" />
      </main>
      <Footer />
    </>
  );
}
