"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { API_URL, getAuthHeaders } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";
import type { SafariPackage } from "@/types/package";

type BookSafariFormProps = {
  safariPackage: SafariPackage;
};

type FormState = {
  travelDate: string;
  guests: string;
  notes: string;
};

export default function BookSafariForm({ safariPackage }: BookSafariFormProps) {
  const router = useRouter();
  const { format, formatFrom } = useCurrency();
  const [form, setForm] = useState<FormState>({
    travelDate: "",
    guests: "1",
    notes: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const estimatedTotalUsd = useMemo(() => {
    const guests = Number(form.guests) || 0;
    return safariPackage.startingPriceUsd * guests;
  }, [form.guests, safariPackage.startingPriceUsd]);

  const estimatedTotalLabel = useMemo(() => {
    const guests = Number(form.guests) || 0;
    return formatFrom(safariPackage.startingPrice * guests, safariPackage.priceCurrency);
  }, [form.guests, formatFrom, safariPackage.priceCurrency, safariPackage.startingPrice]);

  useEffect(() => {
    if (!getAuthToken()) {
      router.replace(`/login?next=${encodeURIComponent(`/packages/${safariPackage.slug}/book`)}`);
      return;
    }

    setIsReady(true);
  }, [router, safariPackage.slug]);

  function handleChange(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/api/bookings`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          packageSlug: safariPackage.slug,
          travelDate: form.travelDate,
          guests: Number(form.guests),
          notes: form.notes.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to submit booking. Please try again.");
        return;
      }

      setSuccess(data.message || "Booking submitted. Check your email for confirmation.");
      setForm({ travelDate: "", guests: "1", notes: "" });

      window.setTimeout(() => {
        router.push("/bookings");
      }, 1500);
    } catch {
      setError("Unable to reach the server. Make sure the API is running.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isReady) {
    return <p className="text-sm text-gray-500">Checking your session...</p>;
  }

  const minDate = new Date().toISOString().slice(0, 10);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-md border border-gray-100 bg-cream px-4 py-3 text-sm text-gray-600">
        <p>
          <span className="font-medium text-forest">Package:</span> {safariPackage.name}
        </p>
        <p className="mt-1">
          <span className="font-medium text-forest">From:</span>{" "}
          {formatFrom(safariPackage.startingPrice, safariPackage.priceCurrency)} per person
        </p>
      </div>

      <div>
        <label htmlFor="travelDate" className="mb-1.5 block text-sm font-medium text-forest">
          Preferred travel date
        </label>
        <input
          id="travelDate"
          type="date"
          required
          min={minDate}
          value={form.travelDate}
          onChange={(e) => handleChange("travelDate", e.target.value)}
          className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
        />
      </div>

      <div>
        <label htmlFor="guests" className="mb-1.5 block text-sm font-medium text-forest">
          Number of guests
        </label>
        <input
          id="guests"
          type="number"
          required
          min={1}
          max={20}
          value={form.guests}
          onChange={(e) => handleChange("guests", e.target.value)}
          className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
        />
      </div>

      <div>
        <label htmlFor="notes" className="mb-1.5 block text-sm font-medium text-forest">
          Special requests (optional)
        </label>
        <textarea
          id="notes"
          rows={4}
          maxLength={1000}
          value={form.notes}
          onChange={(e) => handleChange("notes", e.target.value)}
          className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
        />
      </div>

      <div className="rounded-md border border-gold/30 bg-gold/10 px-4 py-3">
        <p className="text-sm text-gray-600">Estimated total</p>
        <p className="text-2xl font-bold text-forest">{estimatedTotalLabel}</p>
        <p className="mt-1 text-xs text-gray-500">
          {form.guests || 1} guest{(Number(form.guests) || 1) === 1 ? "" : "s"} × package price (
          {format(estimatedTotalUsd)} equivalent). Final quote may vary.
        </p>
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
        className="w-full rounded-md border border-gold bg-gold px-5 py-3 text-sm font-semibold text-forest transition-colors hover:bg-gold-hover disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? "Submitting..." : "Confirm reservation"}
      </button>

      <p className="text-center text-sm text-gray-500">
        You will receive a confirmation email after submitting.{" "}
        <Link href={`/packages/${safariPackage.slug}`} className="font-medium text-forest hover:underline">
          Back to package
        </Link>
      </p>
    </form>
  );
}
