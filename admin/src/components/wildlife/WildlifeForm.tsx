"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import { callEdgeFunction } from "@/lib/api";
import {
  WildlifeSpecies,
  WildlifeFormState,
  emptyWildlifeFormState,
  wildlifeToFormState,
  slugifyWildlife,
  STATUS_OPTIONS,
  CONSERVATION_OPTIONS,
  type WildlifeGalleryImage,
} from "@/types/wildlife";

type WildlifeFormProps = {
  editingSpecies: WildlifeSpecies | null;
  onSaved: () => void;
  onCancelEdit: () => void;
};

export default function WildlifeForm({ editingSpecies, onSaved, onCancelEdit }: WildlifeFormProps) {
  const [form, setForm] = useState<WildlifeFormState>(emptyWildlifeFormState);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingSpecies) {
      setForm(wildlifeToFormState(editingSpecies));
    } else {
      setForm(emptyWildlifeFormState);
    }
    setError("");
    setSuccess("");
  }, [editingSpecies]);

  function handleChange(field: keyof WildlifeFormState, value: string | boolean) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "name" && !editingSpecies) {
        next.slug = slugifyWildlife(String(value));
      }
      return next;
    });
  }

  function addGalleryImage() {
    setForm((prev) => ({
      ...prev,
      galleryImages: [...prev.galleryImages, { url: "", alt: "" }],
    }));
  }

  function updateGalleryImage(index: number, field: keyof WildlifeGalleryImage, value: string) {
    setForm((prev) => ({
      ...prev,
      galleryImages: prev.galleryImages.map((img, i) =>
        i === index ? { ...img, [field]: value } : img
      ),
    }));
  }

  function removeGalleryImage(index: number) {
    setForm((prev) => ({
      ...prev,
      galleryImages: prev.galleryImages.filter((_, i) => i !== index),
    }));
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

    if (form.galleryImages.some((img) => !img.alt.trim())) {
      setError("Add descriptive alt text for every gallery image.");
      setIsSubmitting(false);
      return;
    }

    const payload = {
      name: form.name.trim(),
      slug: form.slug || slugifyWildlife(form.name),
      scientificName: form.scientificName || undefined,
      commonName: form.commonName || undefined,
      shortDescription: form.shortDescription || undefined,
      description: form.description || undefined,
      habitat: form.habitat || undefined,
      behavior: form.behavior || undefined,
      diet: form.diet || undefined,
      conservationStatus: form.conservationStatus || undefined,
      safariViewing: form.safariViewing || undefined,
      status: form.status,
      featured: form.featured,
      heroImage: form.heroImage || undefined,
      galleryImages: form.galleryImages,
      seoTitle: form.seoTitle || undefined,
      seoDescription: form.seoDescription || undefined,
      sortOrder: Number(form.sortOrder) || 0,
    };

    try {
      if (editingSpecies) {
        const { species } = await callEdgeFunction<{ species: WildlifeSpecies }>(
          "wildlife/admin/" + editingSpecies.id,
          { method: "PATCH", body: payload }
        );

        if (!species) throw new Error("Failed to update species.");
        setSuccess("Species updated successfully.");
      } else {
        const { species } = await callEdgeFunction<{ species: WildlifeSpecies }>(
          "wildlife/admin",
          { method: "POST", body: payload }
        );

        if (!species) throw new Error("Failed to create species.");
        setSuccess("Species created successfully.");
        setForm(emptyWildlifeFormState);
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
            {editingSpecies ? "Edit wildlife species" : "Add wildlife species"}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {editingSpecies
              ? "Update species details shown on the public website."
              : "Add a new species to the wildlife explorer."}
          </p>
        </div>
        {editingSpecies && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="text-sm text-gray-500 hover:text-forest"
          >
            Cancel edit
          </button>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{success}</div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-forest">
              Species name *
            </label>
            <input
              id="name"
              required
              placeholder="e.g. African Elephant"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
            />
          </div>
          <div>
            <label htmlFor="slug" className="mb-1.5 block text-sm font-medium text-forest">
              Slug
            </label>
            <input
              id="slug"
              placeholder="auto-generated from name"
              value={form.slug}
              onChange={(e) => handleChange("slug", e.target.value)}
              className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="scientificName" className="mb-1.5 block text-sm font-medium text-forest">
              Scientific name
            </label>
            <input
              id="scientificName"
              placeholder="e.g. Loxodonta africana"
              value={form.scientificName}
              onChange={(e) => handleChange("scientificName", e.target.value)}
              className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
            />
          </div>
          <div>
            <label htmlFor="commonName" className="mb-1.5 block text-sm font-medium text-forest">
              Common name
            </label>
            <input
              id="commonName"
              placeholder="e.g. Savanna Elephant"
              value={form.commonName}
              onChange={(e) => handleChange("commonName", e.target.value)}
              className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
            />
          </div>
        </div>

        <div>
          <label htmlFor="shortDescription" className="mb-1.5 block text-sm font-medium text-forest">
            Short description
          </label>
          <input
            id="shortDescription"
            placeholder="Brief summary for cards and listings"
            value={form.shortDescription}
            onChange={(e) => handleChange("shortDescription", e.target.value)}
            className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
          />
        </div>

        <div>
          <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-forest">
            Full description
          </label>
          <textarea
            id="description"
            rows={5}
            placeholder="Detailed species information"
            value={form.description}
            onChange={(e) => handleChange("description", e.target.value)}
            className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="habitat" className="mb-1.5 block text-sm font-medium text-forest">
              Habitat
            </label>
            <textarea
              id="habitat"
              rows={3}
              placeholder="Natural habitat and environment"
              value={form.habitat}
              onChange={(e) => handleChange("habitat", e.target.value)}
              className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
            />
          </div>
          <div>
            <label htmlFor="behavior" className="mb-1.5 block text-sm font-medium text-forest">
              Behavior
            </label>
            <textarea
              id="behavior"
              rows={3}
              placeholder="Social structure, activity patterns"
              value={form.behavior}
              onChange={(e) => handleChange("behavior", e.target.value)}
              className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="diet" className="mb-1.5 block text-sm font-medium text-forest">
              Diet
            </label>
            <input
              id="diet"
              placeholder="e.g. Herbivore"
              value={form.diet}
              onChange={(e) => handleChange("diet", e.target.value)}
              className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
            />
          </div>
          <div>
            <label htmlFor="conservationStatus" className="mb-1.5 block text-sm font-medium text-forest">
              Conservation status
            </label>
            <select
              id="conservationStatus"
              value={form.conservationStatus}
              onChange={(e) => handleChange("conservationStatus", e.target.value)}
              className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
            >
              <option value="">Select status</option>
              {CONSERVATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="safariViewing" className="mb-1.5 block text-sm font-medium text-forest">
            Safari viewing information
          </label>
          <textarea
            id="safariViewing"
            rows={3}
            placeholder="Best locations, times, and tips for viewing"
            value={form.safariViewing}
            onChange={(e) => handleChange("safariViewing", e.target.value)}
            className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="status" className="mb-1.5 block text-sm font-medium text-forest">
              Status
            </label>
            <select
              id="status"
              value={form.status}
              onChange={(e) => handleChange("status", e.target.value)}
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
            <label htmlFor="sortOrder" className="mb-1.5 block text-sm font-medium text-forest">
              Sort order
            </label>
            <input
              id="sortOrder"
              type="number"
              value={form.sortOrder}
              onChange={(e) => handleChange("sortOrder", e.target.value)}
              className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm text-forest">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => handleChange("featured", e.target.checked)}
                className="rounded border-gray-300 text-forest focus:ring-forest/20"
              />
              Featured species
            </label>
          </div>
        </div>

        <div>
          <label htmlFor="heroImage" className="mb-1.5 block text-sm font-medium text-forest">
            Hero image URL
          </label>
          <input
            id="heroImage"
            placeholder="https://..."
            value={form.heroImage}
            onChange={(e) => handleChange("heroImage", e.target.value)}
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
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-sm font-medium text-forest">Gallery images</label>
            <button
              type="button"
              onClick={addGalleryImage}
              className="text-xs text-forest hover:underline"
            >
              + Add image
            </button>
          </div>
          {form.galleryImages.length === 0 && (
            <p className="text-xs text-gray-500">No gallery images added.</p>
          )}
          <div className="space-y-3">
            {form.galleryImages.map((img, index) => (
              <div key={index} className="flex gap-2">
                <input
                  placeholder="Image URL"
                  value={img.url}
                  onChange={(e) => updateGalleryImage(index, "url", e.target.value)}
                  className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
                />
                <input
                  placeholder="Alt text *"
                  value={img.alt}
                  onChange={(e) => updateGalleryImage(index, "alt", e.target.value)}
                  className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
                />
                <button
                  type="button"
                  onClick={() => removeGalleryImage(index)}
                  className="rounded-md px-2 text-gray-400 hover:text-red-600"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <h3 className="mb-3 text-sm font-medium text-forest">SEO</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="seoTitle" className="mb-1.5 block text-sm text-gray-600">
                SEO title
              </label>
              <input
                id="seoTitle"
                placeholder="Defaults to species name"
                value={form.seoTitle}
                onChange={(e) => handleChange("seoTitle", e.target.value)}
                className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
              />
            </div>
            <div>
              <label htmlFor="seoDescription" className="mb-1.5 block text-sm text-gray-600">
                SEO description
              </label>
              <input
                id="seoDescription"
                placeholder="Defaults to short description"
                value={form.seoDescription}
                onChange={(e) => handleChange("seoDescription", e.target.value)}
                className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="nav-cta rounded-sm px-6 py-3 font-display text-xs font-semibold uppercase tracking-[0.18em] text-forest transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting
              ? "Saving..."
              : editingSpecies
                ? "Update species"
                : "Create species"}
          </button>
        </div>
      </form>
    </section>
  );
}
