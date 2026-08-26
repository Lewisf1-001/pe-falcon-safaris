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

const statusStyles = {
  pending: "bg-orange-100 text-orange-700",
  confirmed: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-600",
};

export default function BookingDetail({ bookingId }: BookingDetailProps) {
  const router = useRouter();
  const { format } = useCurrency();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

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
            packages!bookings_package_id_fkey (name, slug)
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
      } catch {
        setError("Unable to load booking.");
      } finally {
        setIsLoading(false);
      }
    }

    loadBooking();
  }, [bookingId, router]);

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

  return (
    <article className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Booking</p>
          <h1 className="mt-2 text-2xl font-bold text-forest">{booking.packageName}</h1>
        </div>
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize ${statusStyles[booking.status]}`}
        >
          {booking.status}
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
        {booking.notes && (
          <div className="pt-1">
            <dt className="text-gray-500">Notes</dt>
            <dd className="mt-1 text-forest">{booking.notes}</dd>
          </div>
        )}
      </dl>

      {booking.status === "confirmed" && (
        <p className="mt-6 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          Payment received. Your safari reservation is confirmed.
        </p>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        {booking.status === "pending" && (
          <Link
            href={`/bookings/${booking.id}/pay`}
            className="nav-cta rounded-none border-0 px-4 py-2 text-sm font-semibold text-forest transition-opacity hover:opacity-90"
          >
            Pay now
          </Link>
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
