import PackageCard from "@/components/ui/PackageCard";
import type { SafariPackage } from "@/types/package";

type SafariPackagesProps = {
  packages: SafariPackage[];
};

export default function SafariPackages({ packages }: SafariPackagesProps) {
  return (
    <section id="packages" className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="mb-10">
          <h2 className="text-3xl font-bold text-forest">Safari Packages</h2>
          <p className="mt-2 text-gray-500">Handpicked Kenya safari experiences</p>
        </div>

        {packages.length === 0 ? (
          <p className="rounded-xl border border-gray-100 bg-cream px-6 py-8 text-center text-sm text-gray-500">
            Safari packages are being updated. Please check back soon.
          </p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {packages.map((safariPackage) => (
              <PackageCard key={safariPackage.id} package={safariPackage} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
