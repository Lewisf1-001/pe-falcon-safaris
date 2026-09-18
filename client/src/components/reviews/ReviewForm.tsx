"use client";

import { FormEvent, useState } from "react";
import type { ReviewFormData } from "@/types/review";

type BookingOption = {
  id: number;
  packageName: string;
  packageSlug: string;
  travelDate: string;
};

type ReviewFormProps = {
  bookings: BookingOption[];
  onSuccess?: () => void;
  error?: string;
};

const INITIAL_STATE: ReviewFormData = {
  bookingId: 0,
  rating: 0,
  title: "",
  body: "",
};

function validate(form: ReviewFormData): string[] {
  const errors: string[] = [];

  if (!form.bookingId) {
    errors.push("Please select a booking to review.");
  }

  if (form.rating < 1 || form.rating > 5) {
    errors.push("Please select a rating between 1 and 5.");
  }

  if (!form.title.trim()) {
    errors.push("Title is required.");
  } else if (form.title.trim().length > 200) {
    errors.push("Title must be under 200 characters.");
  }

  if (!form.body.trim()) {
    errors.push("Review body is required.");
  } else if (form.body.trim().length > 2000) {
    errors.push("Review body must be under 2000 characters.");
  }

  return errors;
}

export default function ReviewForm({ bookings, onSuccess, error }: ReviewFormProps) {
  const [form, setForm] = useState<ReviewFormData>(INITIAL_STATE);
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function handleChange(field: keyof ReviewFormData, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors([]);

    const validationErrors = validate(form);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

      // Get auth token
      const { createClient } = await import("@/lib/supabase");
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setErrors(["You must be logged in to submit a review."]);
        return;
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: supabaseKey,
        },
        body: JSON.stringify({
          bookingId: form.bookingId,
          rating: form.rating,
          title: form.title.trim(),
          body: form.body.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit review.");
      }

      setSubmitted(true);
      onSuccess?.();
    } catch (err) {
      setErrors([
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      ]);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-2xl text-green-600">
          ✓
        </div>
        <h3 className="text-lg font-semibold text-green-800">
          Review Submitted
        </h3>
        <p className="mt-2 text-sm text-green-700">
          Thank you for sharing your experience! Your review will be visible
          after moderation.
        </p>
        <button
          onClick={() => {
            setSubmitted(false);
            setForm(INITIAL_STATE);
          }}
          className="mt-4 text-sm font-medium text-green-700 underline hover:text-green-800"
        >
          Submit another review
        </button>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="rounded-xl border border-gray-100 bg-gray-50 p-8 text-center">
        {error ? (
          <p className="text-red-600">{error}</p>
        ) : (
          <>
            <p className="text-gray-500">
              You don&apos;t have any completed safaris to review yet.
            </p>
            <p className="mt-2 text-sm text-gray-400">
              Once your safari is completed, you&apos;ll be able to leave a review.
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <ul className="space-y-1 text-sm text-red-700">
            {errors.map((err) => (
              <li key={err}>• {err}</li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <label
          htmlFor="review-booking"
          className="block text-sm font-medium text-forest"
        >
          Safari Booking <span className="text-red-500">*</span>
        </label>
        <select
          id="review-booking"
          required
          value={form.bookingId || ""}
          onChange={(e) => handleChange("bookingId", Number(e.target.value))}
          className="mt-1 block w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-forest outline-none transition-colors focus:border-forest focus:ring-1 focus:ring-forest/20"
        >
          <option value="">Select a completed safari</option>
          {bookings.map((b) => (
            <option key={b.id} value={b.id}>
              {b.packageName} — {b.travelDate}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-forest">
          Rating <span className="text-red-500">*</span>
        </label>
        <div className="mt-2 flex gap-1" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => handleChange("rating", star)}
              className={`text-2xl transition-colors ${
                star <= form.rating
                  ? "text-yellow-400"
                  : "text-gray-300 hover:text-yellow-200"
              }`}
              aria-label={`${star} star${star !== 1 ? "s" : ""}`}
              role="radio"
              aria-checked={star === form.rating}
            >
              ★
            </button>
          ))}
          <span className="ml-2 text-sm text-gray-500">
            {form.rating > 0 ? `${form.rating}/5` : "Select rating"}
          </span>
        </div>
      </div>

      <div>
        <label
          htmlFor="review-title"
          className="block text-sm font-medium text-forest"
        >
          Title <span className="text-red-500">*</span>
        </label>
        <input
          id="review-title"
          type="text"
          required
          maxLength={200}
          value={form.title}
          onChange={(e) => handleChange("title", e.target.value)}
          className="mt-1 block w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-forest outline-none transition-colors focus:border-forest focus:ring-1 focus:ring-forest/20"
          placeholder="Sum up your safari experience"
        />
        <p className="mt-1 text-xs text-gray-400">
          {form.title.length}/200 characters
        </p>
      </div>

      <div>
        <label
          htmlFor="review-body"
          className="block text-sm font-medium text-forest"
        >
          Your Review <span className="text-red-500">*</span>
        </label>
        <textarea
          id="review-body"
          required
          rows={5}
          maxLength={2000}
          value={form.body}
          onChange={(e) => handleChange("body", e.target.value)}
          className="mt-1 block w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-forest outline-none transition-colors focus:border-forest focus:ring-1 focus:ring-forest/20"
          placeholder="Share details about your safari experience, wildlife sightings, guides, and accommodations..."
        />
        <p className="mt-1 text-xs text-gray-400">
          {form.body.length}/2000 characters
        </p>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-forest px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-forest-light disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? "Submitting..." : "Submit Review"}
      </button>
    </form>
  );
}
