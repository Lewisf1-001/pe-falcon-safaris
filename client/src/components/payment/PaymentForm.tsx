"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { API_URL, getAuthHeaders } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";
import type { Booking } from "@/types/booking";

type PaymentFormProps = {
  bookingId: number;
};

type PaymentMethod = "mobile_money" | "card";

type FormState = {
  method: PaymentMethod;
  phone: string;
  cardholderName: string;
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
};

const initialState: FormState = {
  method: "mobile_money",
  phone: "",
  cardholderName: "",
  cardNumber: "",
  expiryMonth: "",
  expiryYear: "",
  cvv: "",
};

export default function PaymentForm({ bookingId }: PaymentFormProps) {
  const router = useRouter();
  const { currency, format, formatIn } = useCurrency();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [form, setForm] = useState<FormState>(initialState);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [awaitingMpesa, setAwaitingMpesa] = useState(false);

  useEffect(() => {
    if (!getAuthToken()) {
      router.replace(`/login?next=${encodeURIComponent(`/bookings/${bookingId}/pay`)}`);
      return;
    }

    async function loadBooking() {
      try {
        const response = await fetch(`${API_URL}/api/bookings/${bookingId}`, {
          headers: getAuthHeaders(),
        });
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Unable to load booking.");
          return;
        }

        if (data.booking.status !== "pending") {
          setError("This booking cannot be paid. It may already be confirmed or cancelled.");
          setBooking(data.booking);
          return;
        }

        setBooking(data.booking);
      } catch {
        setError("Unable to reach the server. Make sure the API is running.");
      } finally {
        setIsLoading(false);
      }
    }

    loadBooking();
  }, [bookingId, router]);

  useEffect(() => {
    if (!awaitingMpesa) {
      return;
    }

    let cancelled = false;
    let attempts = 0;
    let timer: number | undefined;

    function goToBooking() {
      setError("");
      setSuccess("M-Pesa payment received. Your booking is confirmed.");
      setAwaitingMpesa(false);
      setIsSubmitting(false);
      router.replace(`/bookings/${bookingId}`);
    }

    async function pollPaymentStatus() {
      attempts += 1;

      try {
        const [paymentResponse, bookingResponse] = await Promise.all([
          fetch(`${API_URL}/api/payments/by-booking/${bookingId}`, {
            headers: getAuthHeaders(),
          }),
          fetch(`${API_URL}/api/bookings/${bookingId}`, {
            headers: getAuthHeaders(),
          }),
        ]);

        if (cancelled) {
          return;
        }

        if (bookingResponse.ok) {
          const bookingData = await bookingResponse.json();
          if (bookingData.booking?.status === "confirmed") {
            goToBooking();
            return;
          }
        }

        if (paymentResponse.ok) {
          const paymentData = await paymentResponse.json();
          const status = paymentData.payment?.status;

          if (status === "completed") {
            goToBooking();
            return;
          }

          // Only stop for explicit user-cancel/timeout from the Safaricom callback.
          if (status === "failed" || status === "cancelled") {
            setSuccess("");
            setAwaitingMpesa(false);
            setIsSubmitting(false);
            setError("M-Pesa payment was not completed. Please try again.");
            return;
          }
        }
      } catch {
        // Keep polling while waiting for the phone prompt / callback / STK query.
      }

      if (!cancelled && attempts < 60) {
        timer = window.setTimeout(pollPaymentStatus, 2500);
      } else if (!cancelled) {
        setSuccess("");
        setAwaitingMpesa(false);
        setIsSubmitting(false);
        setError(
          "Still waiting for M-Pesa confirmation. If you already paid, open this booking — it may already be confirmed."
        );
      }
    }

    pollPaymentStatus();

    return () => {
      cancelled = true;
      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, [awaitingMpesa, bookingId, router]);

  function handleChange<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    const payload =
      form.method === "mobile_money"
        ? {
            bookingId,
            method: "mobile_money" as const,
            provider: "mpesa" as const,
            phone: form.phone.trim(),
            currency,
          }
        : {
            bookingId,
            method: "card" as const,
            cardholderName: form.cardholderName.trim(),
            cardNumber: form.cardNumber.replace(/\s+/g, ""),
            expiryMonth: Number(form.expiryMonth),
            expiryYear: Number(form.expiryYear),
            cvv: form.cvv.trim(),
            currency,
          };

    try {
      const response = await fetch(`${API_URL}/api/payments`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Payment failed. Please try again.");
        setIsSubmitting(false);
        return;
      }

      if (data.awaitingConfirmation) {
        setError("");
        setSuccess(
          data.message ||
            "M-Pesa prompt sent. Enter your PIN on your phone to complete payment."
        );
        setAwaitingMpesa(true);
        return;
      }

      setError("");
      setSuccess(data.message || "Payment successful. Your booking is confirmed.");
      router.replace(`/bookings/${bookingId}`);
    } catch {
      setError("Unable to reach the server. Make sure the API is running.");
      setIsSubmitting(false);
    } finally {
      if (form.method === "card") {
        setIsSubmitting(false);
      }
    }
  }

  if (isLoading) {
    return <p className="text-sm text-gray-500">Loading payment details...</p>;
  }

  if (!booking) {
    return (
      <div className="space-y-4 text-center">
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error || "Booking not found."}
        </p>
        <Link href="/bookings" className="text-sm font-medium text-forest hover:underline">
          Back to my bookings
        </Link>
      </div>
    );
  }

  if (booking.status !== "pending") {
    return (
      <div className="space-y-4 text-center">
        <p className="rounded-md border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700">
          {error || "This booking cannot be paid."}
        </p>
        <Link
          href={`/bookings/${bookingId}`}
          className="text-sm font-medium text-forest hover:underline"
        >
          View this booking
        </Link>
      </div>
    );
  }

  const currentYear = new Date().getFullYear();
  const amountLabel = format(booking.totalPriceUsd);
  const kesLabel = formatIn(booking.totalPriceUsd, "KES");
  const usdLabel = formatIn(booking.totalPriceUsd, "USD");

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-md border border-gray-100 bg-cream px-4 py-3 text-sm text-gray-600">
        <p>
          <span className="font-medium text-forest">Package:</span> {booking.packageName}
        </p>
        <p className="mt-1">
          <span className="font-medium text-forest">Travel date:</span> {booking.travelDate}
        </p>
        <p className="mt-1">
          <span className="font-medium text-forest">Amount due:</span> {amountLabel}
        </p>
        {form.method === "mobile_money" && (
          <p className="mt-1 text-xs text-gray-500">
            M-Pesa will charge {kesLabel} on your phone
            {currency !== "KES" ? ` (shown above as ${amountLabel}).` : "."}
          </p>
        )}
        {form.method === "card" && currency !== "USD" && (
          <p className="mt-1 text-xs text-gray-500">
            Card payments are settled against {usdLabel}; you are viewing totals in {currency}.
          </p>
        )}
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-forest">Payment method</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <label
            className={`flex cursor-pointer items-center gap-3 rounded-md border px-4 py-3 text-sm ${
              form.method === "mobile_money"
                ? "border-forest bg-forest/5 text-forest"
                : "border-gray-300 text-gray-600"
            }`}
          >
            <input
              type="radio"
              name="method"
              checked={form.method === "mobile_money"}
              onChange={() => handleChange("method", "mobile_money")}
              disabled={awaitingMpesa}
            />
            M-Pesa
          </label>
          <label
            className={`flex cursor-pointer items-center gap-3 rounded-md border px-4 py-3 text-sm ${
              form.method === "card"
                ? "border-forest bg-forest/5 text-forest"
                : "border-gray-300 text-gray-600"
            }`}
          >
            <input
              type="radio"
              name="method"
              checked={form.method === "card"}
              onChange={() => handleChange("method", "card")}
              disabled={awaitingMpesa}
            />
            Card
          </label>
        </div>
      </fieldset>

      {form.method === "mobile_money" ? (
        <div>
          <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-forest">
            M-Pesa mobile number
          </label>
          <input
            id="phone"
            type="tel"
            required
            disabled={awaitingMpesa}
            placeholder="e.g. 0712345678"
            value={form.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
            className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20 disabled:opacity-70"
          />
          <p className="mt-1.5 text-xs text-gray-500">
            You will receive an STK push on this phone to enter your M-Pesa PIN.
          </p>
        </div>
      ) : (
        <>
          <div>
            <label htmlFor="cardholderName" className="mb-1.5 block text-sm font-medium text-forest">
              Name on card
            </label>
            <input
              id="cardholderName"
              type="text"
              required
              value={form.cardholderName}
              onChange={(e) => handleChange("cardholderName", e.target.value)}
              className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
            />
          </div>

          <div>
            <label htmlFor="cardNumber" className="mb-1.5 block text-sm font-medium text-forest">
              Card number
            </label>
            <input
              id="cardNumber"
              type="text"
              inputMode="numeric"
              required
              autoComplete="cc-number"
              placeholder="•••• •••• •••• ••••"
              value={form.cardNumber}
              onChange={(e) => handleChange("cardNumber", e.target.value)}
              className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
            />
            <p className="mt-1.5 text-xs text-gray-500">
              Card details are used to process payment only. Full card numbers are never stored.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="expiryMonth" className="mb-1.5 block text-sm font-medium text-forest">
                Month
              </label>
              <input
                id="expiryMonth"
                type="number"
                required
                min={1}
                max={12}
                placeholder="MM"
                value={form.expiryMonth}
                onChange={(e) => handleChange("expiryMonth", e.target.value)}
                className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
              />
            </div>
            <div>
              <label htmlFor="expiryYear" className="mb-1.5 block text-sm font-medium text-forest">
                Year
              </label>
              <input
                id="expiryYear"
                type="number"
                required
                min={currentYear}
                placeholder="YYYY"
                value={form.expiryYear}
                onChange={(e) => handleChange("expiryYear", e.target.value)}
                className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
              />
            </div>
            <div>
              <label htmlFor="cvv" className="mb-1.5 block text-sm font-medium text-forest">
                CVV
              </label>
              <input
                id="cvv"
                type="password"
                required
                autoComplete="cc-csc"
                maxLength={4}
                value={form.cvv}
                onChange={(e) => handleChange("cvv", e.target.value)}
                className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
              />
            </div>
          </div>
        </>
      )}

      {error && !awaitingMpesa && (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {awaitingMpesa ? (
        <p className="rounded-md border border-forest/20 bg-forest/5 px-4 py-3 text-sm text-forest">
          Waiting for M-Pesa confirmation… enter your PIN on your phone and keep this page open.
        </p>
      ) : (
        success && (
          <p className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {success}
          </p>
        )
      )}

      <button
        type="submit"
        disabled={isSubmitting || awaitingMpesa}
        className="w-full rounded-md border border-gold bg-gold px-5 py-3 text-sm font-semibold text-forest transition-colors hover:bg-gold-hover disabled:cursor-not-allowed disabled:opacity-70"
      >
        {awaitingMpesa
          ? "Waiting for M-Pesa..."
          : isSubmitting
            ? "Processing..."
            : form.method === "mobile_money"
              ? `Pay ${kesLabel} with M-Pesa`
              : `Pay ${amountLabel}`}
      </button>
    </form>
  );
}
