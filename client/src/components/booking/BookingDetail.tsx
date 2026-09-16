"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { createClient } from "@/lib/supabase";
import { getAuthToken } from "@/lib/auth";
import type { Booking } from "@/types/booking";

type BookingDetailProps = {
  bookingId: number;
};

const statusStyles: Record<string, string> = {
  inquiry: "bg-blue-100 text-blue-700",
  quote: "bg-purple-100 text-purple-700",
  pending: "bg-orange-100 text-orange-700",
  deposit_required: "bg-yellow-100 text-yellow-700",
  partially_paid: "bg-amber-100 text-amber-700",
  confirmed: "bg-green-100 text-green-700",
  upcoming: "bg-teal-100 text-teal-700",
  in_progress: "bg-indigo-100 text-indigo-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-gray-100 text-gray-600",
  expired: "bg-gray-100 text-gray-500",
  refunded: "bg-red-100 text-red-700",
};

const CANCELLABLE_STATUSES = ["inquiry", "quote", "pending", "deposit_required"];

export default function BookingDetail({ bookingId }: BookingDetailProps) {
  const router = useRouter();
  const { format } = useCurrency();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");

  useEffect(() => {
    if (!getAuthToken()) {
      router.replace(`/login?next=${encodeURIComponent(`/bookings/${bookingId}`)}`);
      return;
    }

    async function loadBooking() {
      try {
        const supabase = createClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError("You must be logged in.");
          return;
        }

        const { data: profile } = await supabase
          .from("users")
          .select("id")
          .eq("auth_id", user.id)
          .single();

        if (!profile) {
          setError("User profile not found.");
          return;
        }

        const { data, error: fetchError } = await supabase
          .from("bookings")
          .select(`
            *,
            packages!bookings_package_id_fkey (name, slug, destinations, duration, ideal_for)
          `)
          .eq("id", bookingId)
          .eq("user_id", profile.id)
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

        // Load payment status for this booking
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
          const res = await fetch(
            `${supabaseUrl}/functions/v1/payments/by-booking/${bookingId}`,
            {
              headers: {
                Authorization: `Bearer ${session?.access_token || ""}`,
                apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
              },
            }
          );
          if (res.ok) {
            const payData = await res.json();
            setPaymentStatus(payData.payment?.status || null);
          }
        } catch {
          // Payment status is non-critical
        }
      } catch {
        setError("Unable to load booking.");
      } finally {
        setIsLoading(false);
      }
    }

    loadBooking();
  }, [bookingId, router]);

  async function handleCancel() {
    if (!confirm("Are you sure you want to cancel this booking? This cannot be undone.")) {
      return;
    }

    setIsCancelling(true);
    setCancelError("");

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const response = await fetch(
        `${supabaseUrl}/functions/v1/bookings/${bookingId}/cancel`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token || ""}`,
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to cancel booking.");
      }

      setBooking((prev) => prev ? { ...prev, status: "cancelled" } : null);
      setPaymentStatus(null);
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : "Unable to cancel booking.");
    } finally {
      setIsCancelling(false);
    }
  }

  if (isLoading) {
    return <p className="text-sm text-gray-500">Loading booking...</p>;
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

  const statusLabel = booking.status.replace(/_/g, " ");

  return (
    <article className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Booking</p>
          <h1 className="mt-2 text-2xl font-bold text-forest">{booking.packageName}</h1>
          <p className="mt-1 text-sm text-gray-500">Reference: #{booking.id}</p>
        </div>
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize ${statusStyles[booking.status] || "bg-gray-100 text-gray-600"}`}
        >
          {statusLabel}
        </span>
      </div>

      <dl className="mt-6 space-y-3 text-sm">
        <div className="flex justify-between gap-4 border-b border-gray-50 pb-3">
          <dt className="text-gray-500">Travel date</dt>
          <dd className="font-medium text-forest">{booking.travelDate}</dd>
        </div>
        <div className="flex justify-between gap-4 border-b border-gray-50 pb-3">
          <dt className="text-gray-500">Guests</dt>
          <dd className="font-medium text-forest">{booking.guests}</dd>
        </div>
        <div className="flex justify-between gap-4 border-b border-gray-50 pb-3">
          <dt className="text-gray-500">Total</dt>
          <dd className="font-medium text-forest">{format(booking.totalPriceUsd)}</dd>
        </div>
        {paymentStatus && (
          <div className="flex justify-between gap-4 border-b border-gray-50 pb-3">
            <dt className="text-gray-500">Payment</dt>
            <dd className="font-medium text-forest capitalize">{paymentStatus}</dd>
          </div>
        )}
        <div className="flex justify-between gap-4 border-b border-gray-50 pb-3">
          <dt className="text-gray-500">Booked on</dt>
          <dd className="text-forest">
            {new Date(booking.createdAt).toLocaleDateString()}
          </dd>
        </div>
        {booking.notes && (
          <div className="pt-1">
            <dt className="text-gray-500">Notes</dt>
            <dd className="mt-1 text-forest">{booking.notes}</dd>
          </div>
        )}
      </dl>

      {(booking.status === "confirmed" || booking.status === "upcoming" || booking.status === "in_progress") && (
        <p className="mt-6 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {booking.status === "in_progress"
            ? "Your safari is currently in progress. Enjoy your adventure!"
            : booking.status === "upcoming"
              ? "Payment received. Your safari reservation is confirmed and approaching."
              : "Payment received. Your safari reservation is confirmed."}
        </p>
      )}

      {booking.status === "completed" && (
        <p className="mt-6 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Your safari has been completed. We hope you had an amazing experience!
        </p>
      )}

      {booking.status === "expired" && (
        <p className="mt-6 rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
          This booking has expired. Please contact us to rebook.
        </p>
      )}

      {booking.status === "refunded" && (
        <p className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          This booking has been refunded. Please contact us if you have questions.
        </p>
      )}

      {cancelError && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {cancelError}
        </p>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        {(booking.status === "pending" || booking.status === "deposit_required" || booking.status === "partially_paid") && (
          <Link
            href={`/bookings/${booking.id}/pay`}
            className="nav-cta rounded-none border-0 px-4 py-2 text-sm font-semibold text-forest transition-opacity hover:opacity-90"
          >
            Pay now
          </Link>
        )}
        {CANCELLABLE_STATUSES.includes(booking.status) && (
          <button
            type="button"
            disabled={isCancelling}
            onClick={handleCancel}
            className="rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-70"
          >
            {isCancelling ? "Cancelling..." : "Cancel booking"}
          </button>
        )}
        <Link
          href={`/packages/${booking.packageSlug}`}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-forest transition-colors hover:border-forest"
        >
          View package
        </Link>
        <Link href="/bookings" className="px-4 py-2 text-sm font-medium text-forest hover:underline">
          All bookings
        </Link>
      </div>
    </article>
  );
}
