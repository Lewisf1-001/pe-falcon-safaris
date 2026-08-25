"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { API_URL, getAuthHeaders } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";
import type { Booking } from "@/types/booking";

const statusStyles = {
  pending: "bg-orange-100 text-orange-700",
  confirmed: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-600",
};

export default function MyBookingsList() {
  const router = useRouter();
  const { format } = useCurrency();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!getAuthToken()) {
      router.replace("/login?next=/bookings");
      return;
    }

    async function loadBookings() {
      try {
        const response = await fetch(`${API_URL}/api/bookings`, {
          headers: getAuthHeaders(),
        });
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Unable to load bookings.");
          return;
        }

        setBookings(data.bookings);
      } catch {
        setError("Unable to reach the server. Make sure the API is running.");
      } finally {
        setIsLoading(false);
      }
    }

    loadBookings();
  }, [router]);

  if (isLoading) {
    return <p className="text-sm text-gray-500">Loading your bookings...</p>;
  }

  if (error) {
    return (
      <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </p>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="rounded-xl border border-gray-100 bg-cream px-6 py-8 text-center">
        <p className="text-sm text-gray-600">You have not booked a safari yet.</p>
        <Link href="/packages" className="mt-3 inline-block text-sm font-medium text-forest hover:underline">
          Browse safari packages
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {bookings.map((booking) => (
        <article
          key={booking.id}
          className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Link href={`/bookings/${booking.id}`} className="hover:underline">
                <h3 className="text-lg font-semibold text-forest">{booking.packageName}</h3>
              </Link>
              <p className="mt-1 text-sm text-gray-500">
                Travel date: {booking.travelDate} · {booking.guests} guest
                {booking.guests === 1 ? "" : "s"}
              </p>
            </div>
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize ${statusStyles[booking.status]}`}
            >
              {booking.status}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-forest">{format(booking.totalPriceUsd)}</p>
            <div className="flex items-center gap-3">
              {booking.status === "pending" && (
                <Link
                  href={`/bookings/${booking.id}/pay`}
                  className="rounded-none border border-gold bg-gold px-3 py-1.5 text-sm font-semibold text-forest transition-colors hover:bg-gold-hover"
                >
                  Pay now
                </Link>
              )}
              <Link
                href={`/bookings/${booking.id}`}
                className="text-sm font-medium text-forest hover:underline"
              >
                View booking
              </Link>
              <Link
                href={`/packages/${booking.packageSlug}`}
                className="text-sm font-medium text-forest hover:underline"
              >
                View package
              </Link>
            </div>
          </div>

          {booking.notes && (
            <p className="mt-3 text-sm text-gray-500">Notes: {booking.notes}</p>
          )}
        </article>
      ))}
    </div>
  );
}
