"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

type AdminBooking = {
  id: number;
  packageName: string;
  travelDate: string;
  guests: number;
  totalPriceUsd: number;
  status: "pending" | "confirmed" | "cancelled";
  clientName: string;
  clientEmail: string;
  notes: string | null;
  createdAt: string;
};

const statusStyles = {
  pending: "bg-orange-100 text-orange-700",
  confirmed: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-600",
};

export default function AdminBookingsList() {
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const loadBookings = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const supabase = createClient();

      const { data, error: fetchError } = await supabase
        .from("bookings")
        .select(`
          *,
          packages!bookings_package_id_fkey (name, slug),
          users!bookings_user_id_fkey (first_name, last_name, email)
        `)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      const formattedBookings = (data || []).map((b) => ({
        id: Number(b.id),
        packageName: b.packages?.name,
        packageSlug: b.packages?.slug,
        travelDate: b.travel_date?.slice(0, 10),
        guests: b.guests,
        totalPriceUsd: Number(b.total_price_usd),
        status: b.status,
        clientName: `${b.users?.first_name} ${b.users?.last_name}`.trim(),
        clientEmail: b.users?.email,
        notes: b.notes,
        createdAt: b.created_at,
      }));

      setBookings(formattedBookings);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load bookings.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  async function updateStatus(bookingId: number, status: AdminBooking["status"]) {
    setUpdatingId(bookingId);
    setError("");
    setMessage("");

    try {
      const supabase = createClient();

      const { error: updateError } = await supabase
        .from("bookings")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", bookingId);

      if (updateError) throw updateError;

      setMessage("Booking updated.");
      await loadBookings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update booking.");
    } finally {
      setUpdatingId(null);
    }
  }

  if (isLoading) {
    return <p className="text-sm text-gray-500">Loading bookings...</p>;
  }

  return (
    <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      {error && (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {message && (
        <p className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </p>
      )}

      {bookings.length === 0 ? (
        <p className="text-sm text-gray-500">No bookings yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-gray-500">
                <th className="px-2 py-3 font-medium">Client</th>
                <th className="px-2 py-3 font-medium">Package</th>
                <th className="px-2 py-3 font-medium">Travel date</th>
                <th className="px-2 py-3 font-medium">Guests</th>
                <th className="px-2 py-3 font-medium">Total</th>
                <th className="px-2 py-3 font-medium">Status</th>
                <th className="px-2 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-2 py-4">
                    <p className="font-medium text-forest">{booking.clientName}</p>
                    <p className="text-xs text-gray-500">{booking.clientEmail}</p>
                  </td>
                  <td className="px-2 py-4 text-gray-600">{booking.packageName}</td>
                  <td className="px-2 py-4 text-gray-600">{booking.travelDate}</td>
                  <td className="px-2 py-4 text-gray-600">{booking.guests}</td>
                  <td className="px-2 py-4 text-gray-600">USD {booking.totalPriceUsd}</td>
                  <td className="px-2 py-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize ${statusStyles[booking.status]}`}
                    >
                      {booking.status}
                    </span>
                  </td>
                  <td className="px-2 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {booking.status !== "confirmed" && (
                        <button
                          type="button"
                          disabled={updatingId === booking.id}
                          onClick={() => updateStatus(booking.id, "confirmed")}
                          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-forest hover:border-forest disabled:opacity-70"
                        >
                          Confirm
                        </button>
                      )}
                      {booking.status !== "cancelled" && (
                        <button
                          type="button"
                          disabled={updatingId === booking.id}
                          onClick={() => updateStatus(booking.id, "cancelled")}
                          className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-70"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
