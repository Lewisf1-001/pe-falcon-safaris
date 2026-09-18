"use client";

import { FormEvent, useState } from "react";

type FormState = {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  packageName: string;
  destinationName: string;
  travelDate: string;
  guests: string;
};

type InquiryFormProps = {
  initialPackageName?: string;
  initialDestinationName?: string;
  initialSubject?: string;
};

const INITIAL_STATE: FormState = {
  name: "",
  email: "",
  phone: "",
  subject: "",
  message: "",
  packageName: "",
  destinationName: "",
  travelDate: "",
  guests: "",
};

function validate(form: FormState): string[] {
  const errors: string[] = [];

  if (!form.name.trim()) {
    errors.push("Name is required.");
  } else if (form.name.trim().length > 100) {
    errors.push("Name must be under 100 characters.");
  }

  if (!form.email.trim()) {
    errors.push("Email is required.");
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.push("Please enter a valid email address.");
  }

  if (form.phone && form.phone.length > 20) {
    errors.push("Phone number must be under 20 characters.");
  }

  if (form.subject && form.subject.length > 200) {
    errors.push("Subject must be under 200 characters.");
  }

  if (!form.message.trim()) {
    errors.push("Message is required.");
  } else if (form.message.trim().length > 2000) {
    errors.push("Message must be under 2000 characters.");
  }

  if (form.guests) {
    const n = Number(form.guests);
    if (!Number.isInteger(n) || n < 1 || n > 50) {
      errors.push("Number of guests must be between 1 and 50.");
    }
  }

  if (form.travelDate) {
    const d = new Date(form.travelDate);
    if (isNaN(d.getTime())) {
      errors.push("Please enter a valid travel date.");
    }
  }

  return errors;
}

export default function InquiryForm({
  initialPackageName,
  initialDestinationName,
  initialSubject,
}: InquiryFormProps) {
  const [form, setForm] = useState<FormState>({
    ...INITIAL_STATE,
    packageName: initialPackageName || "",
    destinationName: initialDestinationName || "",
    subject: initialSubject || "",
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function handleChange(field: keyof FormState, value: string) {
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

      const response = await fetch(`${supabaseUrl}/functions/v1/email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseKey,
        },
        body: JSON.stringify({
          action: "inquiry-received",
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          subject: form.subject.trim() || undefined,
          message: form.message.trim(),
          packageName: form.packageName.trim() || undefined,
          destinationName: form.destinationName.trim() || undefined,
          travelDate: form.travelDate || undefined,
          guests: form.guests ? Number(form.guests) : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send inquiry.");
      }

      setSubmitted(true);
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
          Inquiry Sent Successfully
        </h3>
        <p className="mt-2 text-sm text-green-700">
          Thank you, {form.name}! We&apos;ve received your inquiry and will
          get back to you within 24 hours.
        </p>
        <button
          onClick={() => {
            setSubmitted(false);
            setForm(INITIAL_STATE);
          }}
          className="mt-4 text-sm font-medium text-green-700 underline hover:text-green-800"
        >
          Send another inquiry
        </button>
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

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label
            htmlFor="inquiry-name"
            className="block text-sm font-medium text-forest"
          >
            Name <span className="text-red-500">*</span>
          </label>
          <input
            id="inquiry-name"
            type="text"
            required
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-forest outline-none transition-colors focus:border-forest focus:ring-1 focus:ring-forest/20"
            placeholder="Your name"
          />
        </div>

        <div>
          <label
            htmlFor="inquiry-email"
            className="block text-sm font-medium text-forest"
          >
            Email <span className="text-red-500">*</span>
          </label>
          <input
            id="inquiry-email"
            type="email"
            required
            value={form.email}
            onChange={(e) => handleChange("email", e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-forest outline-none transition-colors focus:border-forest focus:ring-1 focus:ring-forest/20"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label
            htmlFor="inquiry-phone"
            className="block text-sm font-medium text-forest"
          >
            Phone
          </label>
          <input
            id="inquiry-phone"
            type="tel"
            value={form.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-forest outline-none transition-colors focus:border-forest focus:ring-1 focus:ring-forest/20"
            placeholder="+254 700 000 000"
          />
        </div>

        <div>
          <label
            htmlFor="inquiry-subject"
            className="block text-sm font-medium text-forest"
          >
            Subject
          </label>
          <input
            id="inquiry-subject"
            type="text"
            value={form.subject}
            onChange={(e) => handleChange("subject", e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-forest outline-none transition-colors focus:border-forest focus:ring-1 focus:ring-forest/20"
            placeholder="What can we help with?"
          />
        </div>

        <div>
          <label
            htmlFor="inquiry-package"
            className="block text-sm font-medium text-forest"
          >
            Safari Package
          </label>
          <input
            id="inquiry-package"
            type="text"
            value={form.packageName}
            onChange={(e) => handleChange("packageName", e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-forest outline-none transition-colors focus:border-forest focus:ring-1 focus:ring-forest/20"
            placeholder="e.g. Masai Mara Explorer"
          />
        </div>

        <div>
          <label
            htmlFor="inquiry-destination"
            className="block text-sm font-medium text-forest"
          >
            Destination
          </label>
          <input
            id="inquiry-destination"
            type="text"
            value={form.destinationName}
            onChange={(e) => handleChange("destinationName", e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-forest outline-none transition-colors focus:border-forest focus:ring-1 focus:ring-forest/20"
            placeholder="e.g. Amboseli National Park"
          />
        </div>

        <div>
          <label
            htmlFor="inquiry-date"
            className="block text-sm font-medium text-forest"
          >
            Travel Date
          </label>
          <input
            id="inquiry-date"
            type="date"
            value={form.travelDate}
            onChange={(e) => handleChange("travelDate", e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-forest outline-none transition-colors focus:border-forest focus:ring-1 focus:ring-forest/20"
          />
        </div>

        <div>
          <label
            htmlFor="inquiry-guests"
            className="block text-sm font-medium text-forest"
          >
            Number of Guests
          </label>
          <input
            id="inquiry-guests"
            type="number"
            min={1}
            max={50}
            value={form.guests}
            onChange={(e) => handleChange("guests", e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-forest outline-none transition-colors focus:border-forest focus:ring-1 focus:ring-forest/20"
            placeholder="1"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="inquiry-message"
          className="block text-sm font-medium text-forest"
        >
          Message <span className="text-red-500">*</span>
        </label>
        <textarea
          id="inquiry-message"
          required
          rows={5}
          maxLength={2000}
          value={form.message}
          onChange={(e) => handleChange("message", e.target.value)}
          className="mt-1 block w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-forest outline-none transition-colors focus:border-forest focus:ring-1 focus:ring-forest/20"
          placeholder="Tell us about your safari interests, group size, or any questions..."
        />
        <p className="mt-1 text-xs text-gray-400">
          {form.message.length}/2000 characters
        </p>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-forest px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-forest-light disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? "Sending..." : "Send Inquiry"}
      </button>
    </form>
  );
}
