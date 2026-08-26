"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PackageCardGallery from "@/components/packages/PackageCardGallery";
import FormattedPrice from "@/components/currency/FormattedPrice";
import type { SafariPackage } from "@/types/package";

type PackageCardProps = {
  package: SafariPackage;
};

export default function PackageCard({ package: safariPackage }: PackageCardProps) {
  const [canHover, setCanHover] = useState(false);
  const destinationPreview = safariPackage.destinations.slice(0, 3).join(" · ");
  const galleryImages = safariPackage.galleryImages ?? [];
  const highlightPreview = safariPackage.highlights.slice(0, 3);

  useEffect(() => {
    const media = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => setCanHover(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const details = (
    <>
      <h3 className="font-outfit text-2xl font-semibold tracking-tight text-forest underline decoration-gold decoration-2 underline-offset-8">
        {safariPackage.name}
      </h3>
      <p className="mt-2 text-base font-medium text-gray-600">{safariPackage.duration}</p>

      {safariPackage.idealFor && (
        <p className="mt-4 text-sm font-medium text-gray-700">
          Ideal for:{" "}
          <span className="font-bold text-forest">{safariPackage.idealFor}</span>
        </p>
      )}

      <p className="mt-3 text-sm font-medium leading-relaxed text-gray-600">
        {destinationPreview}
      </p>

      {highlightPreview.length > 0 && (
        <ul className="mt-5 space-y-2.5">
          {highlightPreview.map((highlight) => (
            <li
              key={highlight}
              className="flex items-start gap-3 text-sm font-medium text-gray-700"
            >
              <span
                className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full bg-gold"
                aria-hidden="true"
              />
              <span>{highlight}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto flex items-end justify-between gap-4 border-t border-gray-100 pt-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-600">
            Starting from
          </p>
          <p className="mt-1 text-2xl font-bold text-champagne-deep">
            <FormattedPrice
              amount={safariPackage.startingPrice}
              fromCurrency={safariPackage.priceCurrency}
            />
          </p>
        </div>
        <Link
          href={`/packages/${safariPackage.slug}`}
          className="nav-cta inline-flex items-center justify-center rounded-full px-6 py-3 font-display text-[10px] font-semibold uppercase tracking-[0.18em] text-forest transition-opacity hover:opacity-90 sm:px-7 sm:text-xs"
        >
          View Details
        </Link>
      </div>
    </>
  );

  // Touch / coarse pointers: no 3D flip (Safari often blanks preserve-3d faces).
  if (!canHover) {
    return (
      <article className="flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-md">
        <div className="relative h-64 shrink-0 bg-olive sm:h-72">
          <PackageCardGallery images={galleryImages} packageName={safariPackage.name} />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-forest via-forest/70 to-transparent px-6 pb-5 pt-20">
            <h3 className="font-outfit text-xl font-semibold leading-tight tracking-tight text-white underline decoration-gold decoration-2 underline-offset-8 sm:text-2xl">
              {safariPackage.name}
            </h3>
            <p className="mt-2 text-sm font-medium text-white/90">{safariPackage.duration}</p>
          </div>
        </div>
        <div className="flex flex-1 flex-col p-6 sm:p-7">{details}</div>
      </article>
    );
  }

  return (
    <article className="group h-[560px] [perspective:1000px]">
      <div className="relative h-full w-full transition-transform duration-500 ease-out [transform-style:preserve-3d] motion-reduce:transition-none group-hover:[transform:rotateY(180deg)] group-focus-within:[transform:rotateY(180deg)]">
        <div className="absolute inset-0 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-md [backface-visibility:hidden] [-webkit-backface-visibility:hidden]">
          <div className="relative h-full bg-olive">
            <PackageCardGallery images={galleryImages} packageName={safariPackage.name} />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-forest via-forest/70 to-transparent px-6 pb-10 pt-20">
              <h3 className="font-outfit text-2xl font-semibold leading-tight tracking-tight text-white underline decoration-gold decoration-2 underline-offset-8">
                {safariPackage.name}
              </h3>
              <p className="mt-2 mb-1 text-sm font-medium text-white/90">
                {safariPackage.duration}
              </p>
            </div>
          </div>
        </div>

        <div className="absolute inset-0 flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white p-7 shadow-md [backface-visibility:hidden] [-webkit-backface-visibility:hidden] [transform:rotateY(180deg)]">
          {details}
        </div>
      </div>
    </article>
  );
}
