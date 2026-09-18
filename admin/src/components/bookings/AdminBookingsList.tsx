"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

type AdminBookingStatus =
  | "inquiry"
  | "quote"
  | "pending"
  | "deposit_required"
  | "partially_paid"
  | "confirmed"
  | "upcoming"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "expired"
  | "refunded";

type AdminBooking = {
  id: number;
  packageName: string;
  travelDate: string;
  guests: number;
  totalPriceUsd: number;
  status: AdminBookingStatus;
  clientName: string;
  clientEmail: string;
  notes: string | null;
  createdAt: string;
};

const statusStyles: Record<AdminBookingStatus, string> = {
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

const TERMINAL_STATUSES: AdminBookingStatus[] = ["completed", "cancelled", "refunded"];

function getActions(status: AdminBookingStatus): { label: string; value: AdminBookingStatus; variant: "primary" | "danger" | "secondary" }[] {
  if (TERMINAL_STATUSES.includes(status)) return [];

  const actions: { label: string; value: AdminBookingStatus; variant: "primary" | "danger" | "secondary" }[] = [];

  switch (status) {
    case "inquiry":
      actions.push({ label: "Send quote", value: "quote", variant: "primary" });
      actions.push({ label: "Cancel", value: "cancelled", variant: "danger" });
      break;
    case "quote":
      actions.push({ label: "Mark pending", value: "pending", variant: "primary" });
      actions.push({ label: "Require deposit", value: "deposit_required", variant: "secondary" });
      actions.push({ label: "Cancel", value: "cancelled", variant: "danger" });
      break;
    case "pending":
      actions.push({ label: "Confirm", value: "confirmed", variant: "primary" });
      actions.push({ label: "Require deposit", value: "deposit_required", variant: "secondary" });
      actions.push({ label: "Cancel", value: "cancelled", variant: "danger" });
      break;
    case "deposit_required":
      actions.push({ label: "Mark partially paid", value: "partially_paid", variant: "primary" });
      actions.push({ label: "Confirm", value: "confirmed", variant: "primary" });
      actions.push({ label: "Cancel", value: "cancelled", variant: "danger" });
      break;
    case "partially_paid":
      actions.push({ label: "Confirm", value: "confirmed", variant: "primary" });
      actions.push({ label: "Cancel", value: "cancelled", variant: "danger" });
      break;
    case "confirmed":
      actions.push({ label: "Mark upcoming", value: "upcoming", variant: "primary" });
      actions.push({ label: "Mark in progress", value: "in_progress", variant: "primary" });
      actions.push({ label: "Cancel", value: "cancelled", variant: "danger" });
      break;
    case "upcoming":
      actions.push({ label: "Mark in progress", value: "in_progress", variant: "primary" });
      actions.push({ label: "Cancel", value: "cancelled", variant: "danger" });
      break;
    case "in_progress":
      actions.push({ label: "Complete", value: "completed", variant: "primary" });
      actions.push({ label: "Cancel", value: "cancelled", variant: "danger" });
      break;
    case "expired":
      actions.push({ label: "Reopen as inquiry", value: "inquiry", variant: "secondary" });
      break;
    default:
      break;
  }

  return actions;
}

export default function AdminBookingsList() {
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");

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

  async function updateStatus(bookingId: number, status: AdminBookingStatus) {
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

      setMessage(`Booking updated to "${status}".`);
      await loadBookings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update booking.");
    } finally {
      setUpdatingId(null);
    }
  }

  const filteredBookings = filterStatus === "all"
    ? bookings
    : bookings.filter((b) => b.status === filterStatus);

  const statusCounts = bookings.reduce((acc, b) => {
    acc[b.status] = (acc[b.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

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

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilterStatus("all")}
          className={`rounded-md px-3 py-1.5 text-xs font-medium ${filterStatus === "all" ? "bg-forest text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
        >
          All ({bookings.length})
        </button>
        {Object.entries(statusCounts).map(([status, count]) => (
          <button
            key={status}
            type="button"
            onClick={() => setFilterStatus(status)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize ${filterStatus === status ? "bg-forest text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            {status.replace(/_/g, " ")} ({count})
          </button>
        ))}
      </div>

      {filteredBookings.length === 0 ? (
        <p className="text-sm text-gray-500">No bookings found.</p>
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
              {filteredBookings.map((booking) => {
                const actions = getActions(booking.status);
                return (
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
                        {booking.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-2 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {actions.map((action) => (
                          <button
                            key={action.value}
                            type="button"
                            disabled={updatingId === booking.id}
                            onClick={() => updateStatus(booking.id, action.value)}
                            className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-70 ${
                              action.variant === "danger"
                                ? "border-red-200 text-red-700 hover:bg-red-50"
                                : action.variant === "primary"
                                  ? "border-forest text-forest hover:bg-forest/10"
                                  : "border-gray-300 text-gray-600 hover:bg-gray-50"
                            }`}
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
