"use client";

import { FormEvent, useEffect, useState } from "react";
import { API_URL, getAdminAuthHeaders } from "@/lib/api";
import {
  PackageFormState,
  SafariPackage,
  emptyPackageFormState,
  formStateToPayload,
  packageToFormState,
  slugifyName,
} from "@/types/package";

type PackageFormProps = {
  editingPackage: SafariPackage | null;
  onSaved: () => void;
  onCancelEdit: () => void;
};

export default function PackageForm({ editingPackage, onSaved, onCancelEdit }: PackageFormProps) {
  const [form, setForm] = useState<PackageFormState>(emptyPackageFormState);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingPackage) {
      setForm(packageToFormState(editingPackage));
    } else {
      setForm(emptyPackageFormState);
    }
    setError("");
    setSuccess("");
  }, [editingPackage]);

  function handleChange<K extends keyof PackageFormState>(field: K, value: PackageFormState[K]) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };

      if (field === "name" && !editingPackage) {
        next.slug = slugifyName(String(value));
      }

      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    const payload = formStateToPayload(form);
    const isEditing = Boolean(editingPackage);

    try {
      const response = await fetch(
        isEditing
          ? `${API_URL}/api/admin/packages/${editingPackage!.id}`
          : `${API_URL}/api/admin/packages`,
        {
          method: isEditing ? "PATCH" : "POST",
          headers: getAdminAuthHeaders(),
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to save package. Please try again.");
        return;
      }

      setSuccess(data.message || "Package saved successfully.");
      if (!isEditing) {
        setForm(emptyPackageFormState);
      }
      onSaved();
    } catch {
      setError("Unable to reach the server. Make sure the API is running.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-forest">
            {editingPackage ? "Edit safari package" : "Create safari package"}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {editingPackage
              ? "Update package details shown on the public website."
              : "Add a new package for clients to browse and book."}
          </p>
        </div>
        {editingPackage && (
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
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-forest">
              Package name
            </label>
            <input
              id="name"
              required
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
            />
          </div>
          <div>
            <label htmlFor="slug" className="mb-1.5 block text-sm font-medium text-forest">
              URL slug
            </label>
            <input
              id="slug"
              required
              value={form.slug}
              onChange={(e) => handleChange("slug", e.target.value)}
              className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="duration" className="mb-1.5 block text-sm font-medium text-forest">
              Duration
            </label>
            <input
              id="duration"
              required
              placeholder="3 Days / 2 Nights"
              value={form.duration}
              onChange={(e) => handleChange("duration", e.target.value)}
              className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
            />
          </div>
          <div>
            <label htmlFor="idealFor" className="mb-1.5 block text-sm font-medium text-forest">
              Ideal for
            </label>
            <input
              id="idealFor"
              value={form.idealFor}
              onChange={(e) => handleChange("idealFor", e.target.value)}
              className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
            />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div>
            <label htmlFor="destinations" className="mb-1.5 block text-sm font-medium text-forest">
              Destinations (one per line)
            </label>
            <textarea
              id="destinations"
              required
              rows={6}
              value={form.destinations}
              onChange={(e) => handleChange("destinations", e.target.value)}
              className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
            />
          </div>
          <div>
            <label htmlFor="highlights" className="mb-1.5 block text-sm font-medium text-forest">
              Highlights (one per line)
            </label>
            <textarea
              id="highlights"
              required
              rows={6}
              value={form.highlights}
              onChange={(e) => handleChange("highlights", e.target.value)}
              className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
            />
          </div>
          <div>
            <label htmlFor="includes" className="mb-1.5 block text-sm font-medium text-forest">
              Includes (one per line)
            </label>
            <textarea
              id="includes"
              required
              rows={6}
              value={form.includes}
              onChange={(e) => handleChange("includes", e.target.value)}
              className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="startingPriceUsd" className="mb-1.5 block text-sm font-medium text-forest">
              Starting price (USD)
            </label>
            <input
              id="startingPriceUsd"
              type="number"
              min={1}
              required
              value={form.startingPriceUsd}
              onChange={(e) => handleChange("startingPriceUsd", e.target.value)}
              className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
            />
          </div>
          <div>
            <label htmlFor="priceNote" className="mb-1.5 block text-sm font-medium text-forest">
              Price note
            </label>
            <input
              id="priceNote"
              placeholder="mid-range, indicative"
              value={form.priceNote}
              onChange={(e) => handleChange("priceNote", e.target.value)}
              className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
            />
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
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => handleChange("isActive", e.target.checked)}
            className="rounded border-gray-300 text-forest focus:ring-forest/20"
          />
          Visible on the public website
        </label>

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
          className="rounded-md border border-forest bg-forest px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-forest-light disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Saving..." : editingPackage ? "Update package" : "Create package"}
        </button>
      </form>
    </section>
  );
}
