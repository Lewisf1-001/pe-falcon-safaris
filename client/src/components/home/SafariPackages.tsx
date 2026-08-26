import PackageCard from "@/components/ui/PackageCard";
import type { SafariPackage } from "@/types/package";

type SafariPackagesProps = {
  packages: SafariPackage[];
  surface?: "muted" | "dark";
};

export default function SafariPackages({
  packages,
  surface = "muted",
}: SafariPackagesProps) {
  const isDark = surface === "dark";

  return (
    <section
      id="packages"
      className={`py-16 sm:py-20 ${isDark ? "bg-transparent" : "bg-cream-muted"}`}
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mb-12">
          <h2
            className={`font-outfit text-3xl font-bold tracking-tight sm:text-4xl ${
              isDark ? "text-white" : "text-forest"
            }`}
          >
            Safari Packages
          </h2>
          <p className={`mt-2 font-medium ${isDark ? "text-champagne/90" : "text-gray-600"}`}>
            Handpicked Kenya safari experiences
          </p>
        </div>

        {packages.length === 0 ? (
          <p
            className={`rounded-xl border px-6 py-8 text-center text-sm ${
              isDark
                ? "border-champagne/20 bg-white/5 text-white/60"
                : "border-gray-100 bg-cream text-gray-500"
            }`}
          >
            Safari packages are being updated. Please check back soon.
          </p>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {packages.map((safariPackage) => (
              <PackageCard key={safariPackage.id} package={safariPackage} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
