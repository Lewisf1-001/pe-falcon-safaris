"use client";

import Image from "next/image";
import { ChangeEvent, useRef, useState } from "react";
import { uploadPackageImage, deletePackageImage } from "@/lib/storage";
import { resolvePackageImageSrc } from "@/lib/packageImages";
import type { PackageGalleryImage } from "@/types/package";

type PackageGalleryUploaderProps = {
  images: PackageGalleryImage[];
  onChange: (images: PackageGalleryImage[]) => void;
};

function defaultAltFromFilename(filename: string) {
  const baseName = filename.replace(/\.[^.]+$/, "");
  const words = baseName
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!words) {
    return "Safari destination photo";
  }

  return words.charAt(0).toUpperCase() + words.slice(1);
}

export default function PackageGalleryUploader({
  images,
  onChange,
}: PackageGalleryUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (files.length === 0) {
      return;
    }

    setError("");
    setIsUploading(true);

    try {
      const uploadedImages: PackageGalleryImage[] = [];

      for (const file of files) {
        const url = await uploadPackageImage(file, "package-gallery");
        uploadedImages.push({
          url,
          alt: defaultAltFromFilename(file.name),
        });
      }

      onChange([...images, ...uploadedImages]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to upload images. Please try again.");
    } finally {
      setIsUploading(false);
    }
  }

  function updateAlt(index: number, alt: string) {
    onChange(images.map((image, currentIndex) => (currentIndex === index ? { ...image, alt } : image)));
  }

  function removeImage(index: number) {
    onChange(images.filter((_, currentIndex) => currentIndex !== index));
  }

  function moveImage(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= images.length) {
      return;
    }

    const nextImages = [...images];
    const [moved] = nextImages.splice(index, 1);
    nextImages.splice(nextIndex, 0, moved);
    onChange(nextImages);
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-forest">Package gallery</p>
          <p className="mt-1 text-xs text-gray-500">
            Upload JPEG, PNG, or WebP images from your device. Add descriptive alt text for each photo.
          </p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className="nav-cta rounded-md border-0 px-4 py-2 text-sm font-medium text-forest transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isUploading ? "Uploading..." : "Upload images"}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {images.length === 0 ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className="mt-4 flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-cream px-6 py-10 text-center transition-colors hover:border-forest hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
        >
          <span className="text-3xl" aria-hidden="true">
            📷
          </span>
          <span className="mt-3 text-sm font-medium text-forest">
            {isUploading ? "Uploading images..." : "Choose images from your gallery"}
          </span>
          <span className="mt-1 text-xs text-gray-500">Up to 10 images, 5 MB each</span>
        </button>
      ) : (
        <div className="mt-4 space-y-4">
          {images.map((image, index) => (
            <article
              key={`${image.url}-${index}`}
              className="flex flex-col gap-4 rounded-xl border border-gray-100 bg-cream p-4 sm:flex-row"
            >
              <div className="relative h-32 w-full shrink-0 overflow-hidden rounded-lg bg-olive sm:h-28 sm:w-40">
                <Image
                  src={resolvePackageImageSrc(image.url)}
                  alt={image.alt || "Package gallery preview"}
                  fill
                  sizes="160px"
                  className="object-cover"
                  unoptimized
                />
              </div>

              <div className="flex flex-1 flex-col gap-3">
                <label className="text-sm font-medium text-forest">
                  Alt text
                  <input
                    type="text"
                    value={image.alt}
                    onChange={(event) => updateAlt(index, event.target.value)}
                    placeholder="Describe this photo for accessibility"
                    className="mt-1.5 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
                  />
                </label>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => moveImage(index, -1)}
                    disabled={index === 0}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-forest transition-colors hover:border-forest disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Move up
                  </button>
                  <button
                    type="button"
                    onClick={() => moveImage(index, 1)}
                    disabled={index === images.length - 1}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-forest transition-colors hover:border-forest disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Move down
                  </button>
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-700 transition-colors hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
