"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PackageGalleryImage } from "@/types/package";

type PackageGalleryProps = {
  images: PackageGalleryImage[];
  packageName: string;
};

const AUTO_PLAY_MS = 4000;
const RESUME_DELAY_MS = 5000;
const SWIPE_THRESHOLD = 50;

export default function PackageGallery({ images, packageName }: PackageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
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
    if (!hasMultiple || isPaused) {
      return;
    }

    const intervalId = window.setInterval(goNext, AUTO_PLAY_MS);
    return () => window.clearInterval(intervalId);
  }, [hasMultiple, isPaused, goNext]);

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

  return (
    <div
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
      {images.map((image, index) => (
        <div
          key={`${image.url}-${index}`}
          className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${
            index === activeIndex ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          aria-hidden={index !== activeIndex}
        >
          <Image
            src={image.url}
            alt={image.alt}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 896px"
            className="object-cover"
            priority={index === 0}
          />
        </div>
      ))}

      {hasMultiple && (
        <>
          <button
            type="button"
            onClick={() => {
              goPrev();
              pauseWithResume();
            }}
            className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-xl text-white opacity-100 transition-opacity hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:opacity-0 sm:group-hover:opacity-100 sm:left-4 sm:h-11 sm:w-11"
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
            className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-xl text-white opacity-100 transition-opacity hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:opacity-0 sm:group-hover:opacity-100 sm:right-4 sm:h-11 sm:w-11"
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
