"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { API_URL, getAdminAuthHeaders } from "@/lib/api";
import { convertAmount, type CurrencyCode } from "@/lib/currency";
import {
  PackageFormState,
  SafariPackage,
  emptyPackageFormState,
  formStateToPayload,
  packageToFormState,
  slugifyName,
} from "@/types/package";
import PackageGalleryUploader from "@/components/packages/PackageGalleryUploader";

type PackageFormProps = {
  editingPackage: SafariPackage | null;
  onSaved: () => void;
  onCancelEdit: () => void;
};

export default function PackageForm({ editingPackage, onSaved, onCancelEdit }: PackageFormProps) {
  const { currency, rates, formatInCurrency } = useCurrency();
  const [form, setForm] = useState<PackageFormState>(emptyPackageFormState);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const previousCurrency = useRef<CurrencyCode>(currency);

  useEffect(() => {
    if (editingPackage) {
      const displayPrice = convertAmount(
        editingPackage.startingPrice,
        editingPackage.priceCurrency,
        currency,
        rates
      );
      setForm(packageToFormState(editingPackage, displayPrice));
    } else {
      setForm(emptyPackageFormState);
    }
    setError("");
    setSuccess("");
    previousCurrency.current = currency;
    // Only reset when the selected package changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [editingPackage]);

  useEffect(() => {
    if (previousCurrency.current === currency) {
      return;
    }

    const fromCurrency = previousCurrency.current;
    previousCurrency.current = currency;

    if (editingPackage) {
      const displayPrice = convertAmount(
        editingPackage.startingPrice,
        editingPackage.priceCurrency,
        currency,
        rates
      );
      setForm((prev) => ({ ...prev, startingPrice: String(displayPrice) }));
      return;
    }

    setForm((prev) => {
      const amount = Number(prev.startingPrice);
      if (!prev.startingPrice.trim() || !Number.isFinite(amount) || amount <= 0) {
        return prev;
      }

      const nextDisplay = convertAmount(amount, fromCurrency, currency, rates);
      return { ...prev, startingPrice: String(nextDisplay) };
    });
  }, [currency, rates, editingPackage]);

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

    const startingPrice = Number(form.startingPrice);

    if (!Number.isFinite(startingPrice) || startingPrice <= 0) {
      setError("Enter a valid starting price.");
      setIsSubmitting(false);
      return;
    }

    if (form.galleryImages.some((image) => !image.alt.trim())) {
      setError("Add descriptive alt text for every gallery image.");
      setIsSubmitting(false);
      return;
    }

    // Save the amount in the admin's working currency — no forced USD rounding.
    const payload = formStateToPayload(form, startingPrice, currency);
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
              : "Add a new package for clients to browse and book."}{" "}
            Prices are saved in {currency}.
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

        <PackageGalleryUploader
          images={form.galleryImages}
          onChange={(galleryImages) => handleChange("galleryImages", galleryImages)}
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="startingPrice" className="mb-1.5 block text-sm font-medium text-forest">
              Starting price ({currency})
            </label>
            <input
              id="startingPrice"
              type="number"
              min={currency === "KES" ? 1 : 0.01}
              step={currency === "KES" || currency === "USD" ? 1 : 0.01}
              required
              value={form.startingPrice}
              onChange={(e) => handleChange("startingPrice", e.target.value)}
              className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
            />
            {form.startingPrice.trim() && Number(form.startingPrice) > 0 && (
              <p className="mt-1.5 text-xs text-gray-500">
                Will be saved as {formatInCurrency(Number(form.startingPrice), currency)}
              </p>
            )}
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
