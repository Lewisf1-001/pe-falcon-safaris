"use client";

import { useCallback, useEffect, useState } from "react";
import PackageImage from "@/components/packages/PackageImage";
import type { PackageGalleryImage } from "@/types/package";

type PackageCardGalleryProps = {
  images: PackageGalleryImage[];
  packageName: string;
};

const AUTO_PLAY_MS = 4000;

export default function PackageCardGallery({ images, packageName }: PackageCardGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const imageCount = images.length;
  const hasMultiple = imageCount > 1;

  const goNext = useCallback(() => {
    setActiveIndex((current) => (current + 1) % imageCount);
  }, [imageCount]);

  useEffect(() => {
    if (!hasMultiple) {
      return;
    }

    const intervalId = window.setInterval(goNext, AUTO_PLAY_MS);
    return () => window.clearInterval(intervalId);
  }, [hasMultiple, goNext]);

  if (imageCount === 0) {
    return <div className="h-full w-full bg-olive" aria-hidden="true" />;
  }

  return (
    <div
      className="relative h-full w-full"
      aria-roledescription={hasMultiple ? "carousel" : undefined}
      aria-label={`${packageName} photos`}
    >
      {images.map((image, index) => (
        <div
          key={`${image.url}-${index}`}
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
            index === activeIndex ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          aria-hidden={index !== activeIndex}
        >
          <PackageImage
            src={image.url}
            alt={image.alt}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 400px"
            className="object-cover"
            priority={index === 0}
          />
        </div>
      ))}

      {hasMultiple && (
        <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
          {images.map((image, index) => (
            <span
              key={`${image.url}-dot-${index}`}
              className={`h-2 w-2 rounded-full ${
                index === activeIndex ? "bg-white" : "bg-white/50"
              }`}
              aria-hidden="true"
            />
          ))}
        </div>
      )}
    </div>
  );
}
