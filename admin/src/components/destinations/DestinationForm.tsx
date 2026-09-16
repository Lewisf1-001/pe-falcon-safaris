"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import { callEdgeFunction } from "@/lib/api";
import {
  type Destination,
  type DestinationFormState,
  type DestinationStatus,
  emptyDestinationFormState,
  destinationToFormState,
  slugifyDestination,
} from "@/types/destination";

type DestinationFormProps = {
  editingDestination: Destination | null;
  onSaved: () => void;
  onCancelEdit: () => void;
};

const STATUS_OPTIONS: { value: DestinationStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

export default function DestinationForm({
  editingDestination,
  onSaved,
  onCancelEdit,
}: DestinationFormProps) {
  const [form, setForm] = useState<DestinationFormState>(emptyDestinationFormState);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingDestination) {
      setForm(destinationToFormState(editingDestination));
    } else {
      setForm(emptyDestinationFormState);
    }
    setError("");
    setSuccess("");
  }, [editingDestination]);

  function handleChange<K extends keyof DestinationFormState>(
    field: K,
    value: DestinationFormState[K]
  ) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "name" && !editingDestination) {
        next.slug = slugifyDestination(String(value));
      }
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    if (!form.name.trim()) {
      setError("Name is required.");
      setIsSubmitting(false);
      return;
    }

    if (form.name.trim().length > 255) {
      setError("Name must be 255 characters or less.");
      setIsSubmitting(false);
      return;
    }

    if (form.seoTitle.length > 255) {
      setError("SEO title must be 255 characters or less.");
      setIsSubmitting(false);
      return;
    }

    if (form.galleryImages.some((image) => !image.alt.trim())) {
      setError("Add descriptive alt text for every gallery image.");
      setIsSubmitting(false);
      return;
    }

    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim() || slugifyDestination(form.name),
      country: form.country.trim() || null,
      region: form.region.trim() || null,
      shortDescription: form.shortDescription.trim() || null,
      description: form.description.trim() || null,
      status: form.status,
      featured: form.featured,
      heroImage: form.heroImage.trim() || null,
      galleryImages: form.galleryImages.filter((img) => img.url.trim() && img.alt.trim()),
      seoTitle: form.seoTitle.trim() || null,
      seoDescription: form.seoDescription.trim() || null,
      sortOrder: Number(form.sortOrder) || 0,
    };

    const isEditing = Boolean(editingDestination);

    try {
      if (isEditing) {
        await callEdgeFunction("destinations/admin/" + editingDestination!.id, {
          method: "PATCH",
          body: payload,
        });
      } else {
        await callEdgeFunction("destinations/admin", {
          method: "POST",
          body: payload,
        });
      }

      setSuccess(
        isEditing
          ? "Destination updated successfully."
          : "Destination created successfully."
      );
      if (!isEditing) {
        setForm(emptyDestinationFormState);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-forest">
            {editingDestination ? "Edit destination" : "Create destination"}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {editingDestination
              ? "Update destination content shown on the public website."
              : "Add a new destination for clients to explore."}
          </p>
        </div>
        {editingDestination && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="text-sm font-medium text-forest hover:underline"
          >
            Cancel edit
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="dest-name" className="mb-1.5 block text-sm font-medium text-forest">
              Destination name
            </label>
            <input
              id="dest-name"
              required
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
            />
          </div>
          <div>
            <label htmlFor="dest-slug" className="mb-1.5 block text-sm font-medium text-forest">
              URL slug
            </label>
            <input
              id="dest-slug"
              required
              value={form.slug}
              onChange={(e) => handleChange("slug", e.target.value)}
              className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="dest-country" className="mb-1.5 block text-sm font-medium text-forest">
              Country
            </label>
            <input
              id="dest-country"
              value={form.country}
              onChange={(e) => handleChange("country", e.target.value)}
              placeholder="Kenya"
              className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
            />
          </div>
          <div>
            <label htmlFor="dest-region" className="mb-1.5 block text-sm font-medium text-forest">
              Region
            </label>
            <input
              id="dest-region"
              value={form.region}
              onChange={(e) => handleChange("region", e.target.value)}
              placeholder="Southwest Kenya"
              className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
            />
          </div>
        </div>

        <div>
          <label htmlFor="dest-short-desc" className="mb-1.5 block text-sm font-medium text-forest">
            Short description
          </label>
          <textarea
            id="dest-short-desc"
            rows={2}
            value={form.shortDescription}
            onChange={(e) => handleChange("shortDescription", e.target.value)}
            placeholder="A brief summary for cards and previews"
            className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
          />
        </div>

        <div>
          <label htmlFor="dest-description" className="mb-1.5 block text-sm font-medium text-forest">
            Full description
          </label>
          <textarea
            id="dest-description"
            rows={6}
            value={form.description}
            onChange={(e) => handleChange("description", e.target.value)}
            placeholder="Detailed description of this destination"
            className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
          />
        </div>

        <div>
          <label htmlFor="dest-hero-image" className="mb-1.5 block text-sm font-medium text-forest">
            Hero image URL
          </label>
          <input
            id="dest-hero-image"
            value={form.heroImage}
            onChange={(e) => handleChange("heroImage", e.target.value)}
            placeholder="https://..."
            className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
          />
          {form.heroImage && (
            <div className="relative mt-2 h-40 overflow-hidden rounded-lg bg-olive">
              <Image
                src={form.heroImage}
                alt="Hero preview"
                fill
                sizes="100%"
                className="object-cover"
                unoptimized
              />
            </div>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-forest">
            Gallery images
          </label>
          <p className="mb-2 text-xs text-gray-500">
            Add image URLs and alt text. These images will appear in the destination gallery.
          </p>
          {form.galleryImages.map((image, index) => (
            <div key={index} className="mb-3 flex gap-2">
              <input
                value={image.url}
                onChange={(e) => {
                  const updated = [...form.galleryImages];
                  updated[index] = { ...updated[index], url: e.target.value };
                  handleChange("galleryImages", updated);
                }}
                placeholder="Image URL"
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
              />
              <input
                value={image.alt}
                onChange={(e) => {
                  const updated = [...form.galleryImages];
                  updated[index] = { ...updated[index], alt: e.target.value };
                  handleChange("galleryImages", updated);
                }}
                placeholder="Alt text"
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
              />
              <button
                type="button"
                onClick={() => {
                  const updated = form.galleryImages.filter((_, i) => i !== index);
                  handleChange("galleryImages", updated);
                }}
                className="rounded-md border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              handleChange("galleryImages", [
                ...form.galleryImages,
                { url: "", alt: "" },
              ])
            }
            className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-forest hover:bg-gray-50"
          >
            + Add image
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="dest-status" className="mb-1.5 block text-sm font-medium text-forest">
              Status
            </label>
            <select
              id="dest-status"
              value={form.status}
              onChange={(e) => handleChange("status", e.target.value as DestinationStatus)}
              className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="dest-sort-order" className="mb-1.5 block text-sm font-medium text-forest">
              Sort order
            </label>
            <input
              id="dest-sort-order"
              type="number"
              value={form.sortOrder}
              onChange={(e) => handleChange("sortOrder", e.target.value)}
              className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={form.featured}
            onChange={(e) => handleChange("featured", e.target.checked)}
            className="rounded border-gray-300 text-forest focus:ring-forest/20"
          />
          Featured destination (shown on homepage)
        </label>

        <div className="border-t border-gray-100 pt-4">
          <p className="mb-3 text-sm font-medium text-forest">SEO (optional)</p>
          <div className="space-y-3">
            <div>
              <label htmlFor="dest-seo-title" className="mb-1.5 block text-sm text-gray-600">
                SEO title
              </label>
              <input
                id="dest-seo-title"
                value={form.seoTitle}
                onChange={(e) => handleChange("seoTitle", e.target.value)}
                placeholder="Custom page title for search engines"
                maxLength={255}
                className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
              />
            </div>
            <div>
              <label htmlFor="dest-seo-desc" className="mb-1.5 block text-sm text-gray-600">
                SEO description
              </label>
              <textarea
                id="dest-seo-desc"
                rows={2}
                value={form.seoDescription}
                onChange={(e) => handleChange("seoDescription", e.target.value)}
                placeholder="Meta description for search engines"
                className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
              />
            </div>
          </div>
        </div>

        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {success && (
          <p className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {success}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="nav-cta rounded-md border-0 px-5 py-2.5 text-sm font-semibold text-forest transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting
            ? "Saving..."
            : editingDestination
              ? "Update destination"
              : "Create destination"}
        </button>
      </form>
    </section>
  );
}
