"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { createClient } from "@/lib/supabase";
import { getUser } from "@/lib/auth";
import type { Booking } from "@/types/booking";

type PaymentFormProps = {
  bookingId: number;
};

type PaymentMethod = "mobile_money" | "card";

type FormState = {
  method: PaymentMethod;
  phone: string;
};

const initialState: FormState = {
  method: "mobile_money",
  phone: "",
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
  const pollIdRef = useRef(0);

  useEffect(() => {
    async function checkAuth() {
      const user = await getUser();
      if (!user) {
        router.replace(`/login?next=${encodeURIComponent(`/bookings/${bookingId}/pay`)}`);
        return;
      }

      async function loadBooking() {
        try {
          const supabase = createClient();

          const { data, error: fetchError } = await supabase
            .from("bookings")
            .select(`
              *,
              packages!bookings_package_id_fkey (name, slug)
            `)
            .eq("id", bookingId)
            .single();

          if (fetchError || !data) {
            setError("Booking not found.");
            return;
          }

          setBooking({
            id: Number(data.id),
            userId: Number(data.user_id),
            packageId: Number(data.package_id),
            packageName: data.packages?.name,
            packageSlug: data.packages?.slug,
            travelDate: data.travel_date?.slice(0, 10),
            guests: data.guests,
            totalPriceUsd: Number(data.total_price_usd),
            status: data.status,
            notes: data.notes,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          });

          if (data.status !== "pending") {
            setError("This booking cannot be paid. It may already be confirmed or cancelled.");
          }
        } catch {
          setError("Unable to load booking.");
        } finally {
          setIsLoading(false);
        }
      }

      loadBooking();
    }

    checkAuth();
  }, [bookingId, router]);

  function handleChange<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  /**
   * Poll the M-Pesa status endpoint until the payment settles or we time out.
   * Runs in the background; pollIdRef lets the user cancel out of the panel.
   */
  async function pollMpesaStatus(checkoutRequestId: string, token: string) {
    const pollId = ++pollIdRef.current;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const headers = {
      Authorization: `Bearer ${token}`,
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    };

    // Poll every 3s for up to ~90s while the user enters their PIN.
    const maxAttempts = 30;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      if (pollId !== pollIdRef.current) return;

      try {
        const res = await fetch(
          `${supabaseUrl}/functions/v1/mpesa/status/${checkoutRequestId}`,
          { headers }
        );
        if (!res.ok) continue;

        const data = await res.json().catch(() => null);
        if (pollId !== pollIdRef.current) return;

        if (data?.status === "completed") {
          setAwaitingMpesa(false);
          setSuccess("");
          router.replace(`/bookings/${bookingId}`);
          return;
        }

        if (data?.status === "failed" || data?.status === "cancelled") {
          setAwaitingMpesa(false);
          setError(
            data.status === "cancelled"
              ? "The M-Pesa request was cancelled or timed out. Please try again."
              : "The M-Pesa payment failed. Please try again."
          );
          return;
        }
      } catch {
        // Network hiccup — keep polling until the attempt budget runs out.
      }
    }

    if (pollId === pollIdRef.current) {
      setAwaitingMpesa(false);
      setError(
        "We haven't received a payment confirmation yet. If you completed the payment, check your bookings page in a minute — otherwise please try again."
      );
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      const supabase = createClient();

      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

      if (!session) {
        setError("Your session has expired. Please log in again.");
        return;
      }

      const authHeaders = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      };

      // Create the payment via the Edge Function. It validates booking
      // ownership/status against the database.
      // Card payments are not supported — only M-Pesa mobile money.
      const createRes = await fetch(`${supabaseUrl}/functions/v1/payments`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          bookingId,
          method: "mobile_money",
          provider: "mpesa",
          phone: form.phone.trim(),
        }),
      });

      const createData = await createRes.json().catch(() => null);

      if (!createRes.ok || !createData?.payment) {
        throw new Error(createData?.error || "Payment failed. Please try again.");
      }

      if (!createData.awaitingConfirmation) {
        setSuccess("Payment successful. Your reservation is confirmed.");
        router.replace(`/bookings/${bookingId}`);
        return;
      }

      // M-Pesa: initiate the STK push against the payment record just created
      // Note: amount is NOT sent - the server uses the amount from the payment record
      try {
        const stkResponse = await fetch(`${supabaseUrl}/functions/v1/mpesa`, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({
            action: "stk-push",
            phone: form.phone.trim(),
            paymentId: createData.payment.id,
          }),
        });

        const stkContentType = stkResponse.headers.get("content-type") || "";

        if (!stkResponse.ok || !stkContentType.includes("application/json")) {
          setSuccess(
            "Payment record created. M-Pesa prompt could not be sent. Please try again or contact support."
          );
        } else {
          const stkData = await stkResponse.json().catch(() => null);
          setSuccess(
            "M-Pesa prompt sent. Enter your PIN on your phone to complete payment."
          );
          if (stkData?.CheckoutRequestID) {
            setAwaitingMpesa(true);
            void pollMpesaStatus(stkData.CheckoutRequestID, session.access_token);
          }
        }
      } catch {
        setSuccess(
          "Payment record created. M-Pesa prompt could not be sent. Please try again or contact support."
        );
      }
      return;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed.");
    } finally {
      setIsSubmitting(false);
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

  if (awaitingMpesa) {
    return (
      <div className="rounded-md border border-gold/30 bg-gold/10 px-6 py-10 text-center">
        <div
          className="mx-auto mb-4 h-10 w-10 animate-pulse rounded-full bg-forest/20"
          aria-hidden="true"
        />
        <h2 className="text-lg font-semibold text-forest">Awaiting M-Pesa confirmation</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-gray-600">
          {success || "Enter your M-Pesa PIN on your phone to complete the payment."} This page
          updates automatically once payment is received.
        </p>
        <button
          type="button"
          onClick={() => {
            pollIdRef.current += 1; // stop the background poll
            setAwaitingMpesa(false);
          }}
          className="mt-6 text-sm font-medium text-forest underline hover:opacity-80"
        >
          Back to payment options
        </button>
      </div>
    );
  }

  const amountLabel = format(booking.totalPriceUsd);
  const kesLabel = formatIn(booking.totalPriceUsd, "KES");

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
      </div>

      <div>
        <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-forest">
          M-Pesa mobile number
        </label>
        <input
          id="phone"
          type="tel"
          required
          placeholder="e.g. 0712345678"
          value={form.phone}
          onChange={(e) => handleChange("phone", e.target.value)}
          className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
        />
        <p className="mt-1.5 text-xs text-gray-500">
          You will receive an STK push on this phone to enter your M-Pesa PIN.
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
        className="w-full nav-cta rounded-none border-0 px-5 py-3 text-sm font-semibold text-forest transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? "Processing..." : `Pay ${kesLabel} with M-Pesa`}
      </button>
    </form>
  );
}
