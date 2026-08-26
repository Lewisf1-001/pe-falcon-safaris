"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PackageImage from "@/components/packages/PackageImage";
import type { PackageGalleryImage } from "@/types/package";

type PackageCardGalleryProps = {
  images: PackageGalleryImage[];
  packageName: string;
};

const AUTO_PLAY_MS = 5000;
const MAX_CARD_IMAGES = 4;

export default function PackageCardGallery({ images, packageName }: PackageCardGalleryProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  const galleryImages = images.slice(0, MAX_CARD_IMAGES);
  const imageCount = galleryImages.length;
  const hasMultiple = imageCount > 1;

  const goTo = useCallback(
    (index: number) => {
      if (imageCount === 0) {
        return;
      }

      setActiveIndex(((index % imageCount) + imageCount) % imageCount);
    },
    [imageCount]
  );

  const goNext = useCallback(() => {
    setActiveIndex((current) => (current + 1) % imageCount);
  }, [imageCount]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { rootMargin: "120px 0px", threshold: 0.15 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!hasMultiple || !isVisible || reduceMotion) {
      return;
    }

    const intervalId = window.setInterval(goNext, AUTO_PLAY_MS);
    return () => window.clearInterval(intervalId);
  }, [hasMultiple, isVisible, reduceMotion, goNext]);

  if (imageCount === 0) {
    return <div className="h-full w-full bg-olive" aria-hidden="true" />;
  }

  const mountedIndexes = new Set(
    hasMultiple && isVisible
      ? [activeIndex, (activeIndex + 1) % imageCount]
      : [activeIndex]
  );

  return (
    <div
      ref={rootRef}
      className="relative h-full w-full"
      aria-roledescription={hasMultiple ? "carousel" : undefined}
      aria-label={`${packageName} photos`}
    >
      {galleryImages.map((image, index) => {
        if (!mountedIndexes.has(index)) {
          return null;
        }

        const isActive = index === activeIndex;

        return (
          <div
            key={`${image.url}-${index}`}
            className={`absolute inset-0 transition-opacity duration-500 ease-out motion-reduce:transition-none ${
              isActive ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
            aria-hidden={!isActive}
          >
            <PackageImage
              src={image.url}
              alt={image.alt}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover"
              priority={false}
              quality={65}
            />
          </div>
        );
      })}

      {hasMultiple && (
        <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
          {galleryImages.map((image, index) => (
            <button
              key={`${image.url}-dot-${index}`}
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                goTo(index);
              }}
              className={`h-2 w-2 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne ${
                index === activeIndex
                  ? "bg-champagne"
                  : "bg-champagne/40 hover:bg-champagne/70"
              }`}
              aria-label={`Go to image ${index + 1} of ${imageCount}`}
              aria-current={index === activeIndex ? "true" : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
