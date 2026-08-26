"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PackageImage from "@/components/packages/PackageImage";
import type { PackageGalleryImage } from "@/types/package";

type PackageGalleryProps = {
  images: PackageGalleryImage[];
  packageName: string;
};

const AUTO_PLAY_MS = 4500;
const RESUME_DELAY_MS = 5000;
const SWIPE_THRESHOLD = 50;

export default function PackageGallery({ images, packageName }: PackageGalleryProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const resumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartXRef = useRef<number | null>(null);

  const imageCount = images.length;
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

  const goPrev = useCallback(() => {
    setActiveIndex((current) => (current - 1 + imageCount) % imageCount);
  }, [imageCount]);

  const scheduleResume = useCallback(() => {
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
    }

    resumeTimeoutRef.current = setTimeout(() => {
      setIsPaused(false);
    }, RESUME_DELAY_MS);
  }, []);

  const pauseWithResume = useCallback(() => {
    setIsPaused(true);
    scheduleResume();
  }, [scheduleResume]);

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
      { rootMargin: "160px 0px", threshold: 0.2 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!hasMultiple || isPaused || !isVisible || reduceMotion) {
      return;
    }

    const intervalId = window.setInterval(goNext, AUTO_PLAY_MS);
    return () => window.clearInterval(intervalId);
  }, [hasMultiple, isPaused, isVisible, reduceMotion, goNext]);

  useEffect(() => {
    return () => {
      if (resumeTimeoutRef.current) {
        clearTimeout(resumeTimeoutRef.current);
      }
    };
  }, []);

  if (imageCount === 0) {
    return (
      <div
        className="aspect-[16/10] rounded-xl bg-olive"
        aria-label={`${packageName} photo gallery`}
      />
    );
  }

  const mountedIndexes = new Set(
    hasMultiple
      ? [activeIndex, (activeIndex + 1) % imageCount, (activeIndex - 1 + imageCount) % imageCount]
      : [0]
  );

  return (
    <div
      ref={rootRef}
      className="group relative aspect-[16/10] overflow-hidden rounded-xl bg-forest"
      aria-roledescription="carousel"
      aria-label={`${packageName} photo gallery`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => {
        if (resumeTimeoutRef.current) {
          clearTimeout(resumeTimeoutRef.current);
        }
        setIsPaused(false);
      }}
      onTouchStart={(event) => {
        touchStartXRef.current = event.touches[0]?.clientX ?? null;
        pauseWithResume();
      }}
      onTouchEnd={(event) => {
        if (touchStartXRef.current == null) {
          return;
        }

        const touchEndX = event.changedTouches[0]?.clientX ?? touchStartXRef.current;
        const delta = touchEndX - touchStartXRef.current;
        touchStartXRef.current = null;

        if (Math.abs(delta) >= SWIPE_THRESHOLD) {
          if (delta < 0) {
            goNext();
          } else {
            goPrev();
          }
        }
      }}
    >
      {images.map((image, index) => {
        if (!mountedIndexes.has(index)) {
          return null;
        }

        const isActive = index === activeIndex;

        return (
          <div
            key={`${image.url}-${index}`}
            className={`absolute inset-0 transition-opacity duration-500 ease-in-out motion-reduce:transition-none ${
              isActive ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
            aria-hidden={!isActive}
          >
            <PackageImage
              src={image.url}
              alt={image.alt}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 896px"
              className="object-cover"
              priority={index === 0}
              quality={index === 0 ? 75 : 70}
            />
          </div>
        );
      })}

      {hasMultiple && (
        <>
          <button
            type="button"
            onClick={() => {
              goPrev();
              pauseWithResume();
            }}
            className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-xl text-white opacity-100 transition-opacity hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:left-4 sm:h-11 sm:w-11 sm:opacity-0 sm:group-hover:opacity-100"
            aria-label="Previous image"
          >
            ←
          </button>

          <button
            type="button"
            onClick={() => {
              goNext();
              pauseWithResume();
            }}
            className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-xl text-white opacity-100 transition-opacity hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:right-4 sm:h-11 sm:w-11 sm:opacity-0 sm:group-hover:opacity-100"
            aria-label="Next image"
          >
            →
          </button>

          <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2">
            {images.map((image, index) => (
              <button
                key={`${image.url}-dot-${index}`}
                type="button"
                onClick={() => {
                  goTo(index);
                  pauseWithResume();
                }}
                className={`h-2.5 w-2.5 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                  index === activeIndex ? "bg-white" : "bg-white/50 hover:bg-white/80"
                }`}
                aria-label={`Go to image ${index + 1} of ${imageCount}`}
                aria-current={index === activeIndex ? "true" : undefined}
              />
            ))}
          </div>

          <p className="sr-only" aria-live="polite">
            Image {activeIndex + 1} of {imageCount}: {images[activeIndex]?.alt}
          </p>
        </>
      )}
    </div>
  );
}
