import Image from "next/image";
import Button from "@/components/ui/Button";
import FormattedPrice from "@/components/currency/FormattedPrice";
import type { SafariPackage } from "@/types/package";

type PackageCardProps = {
  package: SafariPackage;
};

export default function PackageCard({ package: safariPackage }: PackageCardProps) {
  const destinationPreview = safariPackage.destinations.slice(0, 2).join(" · ");
  const coverImage = safariPackage.galleryImages?.[0];

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="relative aspect-[4/3] bg-olive">
        {coverImage ? (
          <Image
            src={coverImage.url}
            alt={coverImage.alt}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 400px"
            className="object-cover"
          />
        ) : (
          <div className="h-full w-full bg-olive" aria-hidden="true" />
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-bold text-forest">{safariPackage.name}</h3>
        <p className="mt-1 text-sm text-gray-500">{safariPackage.duration}</p>
        {safariPackage.idealFor && (
          <p className="mt-2 text-sm text-gray-600">
            Ideal for: <span className="font-medium">{safariPackage.idealFor}</span>
          </p>
        )}
        <p className="mt-2 text-sm text-gray-500">{destinationPreview}</p>

        <div className="mt-auto flex items-end justify-between gap-4 pt-5">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Starting from</p>
            <p className="text-xl font-bold text-gold">
              <FormattedPrice
                amount={safariPackage.startingPrice}
                fromCurrency={safariPackage.priceCurrency}
              />
            </p>
          </div>
          <Button variant="outline" href={`/packages/${safariPackage.slug}`} className="px-4 py-2 text-sm">
            View Details
          </Button>
        </div>
      </div>
    </article>
  );
}
