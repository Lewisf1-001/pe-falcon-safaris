"use client";

import { useCallback, useEffect, useState } from "react";
import { API_URL, getAdminAuthHeaders } from "@/lib/api";

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
      const response = await fetch(`${API_URL}/api/admin/bookings`, {
        headers: getAdminAuthHeaders(),
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
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  async function updateStatus(bookingId: number, status: AdminBooking["status"]) {
    setUpdatingId(bookingId);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/api/admin/bookings/${bookingId}`, {
        method: "PATCH",
        headers: getAdminAuthHeaders(),
        body: JSON.stringify({ status }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to update booking.");
        return;
      }

      setMessage(data.message || "Booking updated.");
      await loadBookings();
    } catch {
      setError("Unable to reach the server. Make sure the API is running.");
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
