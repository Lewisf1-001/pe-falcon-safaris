"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { createClient } from "@/lib/supabase";
import { getAuthToken } from "@/lib/auth";
import type { Booking, BookingStatus } from "@/types/booking";

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

const UPCOMING_STATUSES: BookingStatus[] = [
  "inquiry", "quote", "pending", "deposit_required", "partially_paid",
  "confirmed", "upcoming",
];
const ACTIVE_STATUSES: BookingStatus[] = ["in_progress"];
const PAST_STATUSES: BookingStatus[] = ["completed", "cancelled", "expired", "refunded"];

type Tab = "upcoming" | "active" | "past";

export default function DashboardBookings() {
  const { format } = useCurrency();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("upcoming");

  useEffect(() => {
    if (!getAuthToken()) return;

    async function loadBookings() {
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
          .eq("user_id", profile.id)
          .order("created_at", { ascending: false });

        if (fetchError) throw fetchError;

        const formatted: Booking[] = (data || []).map((b) => ({
          id: Number(b.id),
          userId: Number(b.user_id),
          packageId: Number(b.package_id),
          packageName: b.packages?.name,
          packageSlug: b.packages?.slug,
          travelDate: b.travel_date?.slice(0, 10),
          guests: b.guests,
          totalPriceUsd: Number(b.total_price_usd),
          status: b.status,
          notes: b.notes,
          createdAt: b.created_at,
          updatedAt: b.updated_at,
        }));

        setBookings(formatted);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load bookings.");
      } finally {
        setIsLoading(false);
      }
    }

    loadBookings();
  }, []);

  const upcoming = bookings.filter((b) => UPCOMING_STATUSES.includes(b.status));
  const active = bookings.filter((b) => ACTIVE_STATUSES.includes(b.status));
  const past = bookings.filter((b) => PAST_STATUSES.includes(b.status));

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "upcoming", label: "Upcoming", count: upcoming.length },
    { key: "active", label: "Active", count: active.length },
    { key: "past", label: "Past", count: past.length },
  ];

  const displayed = activeTab === "upcoming" ? upcoming : activeTab === "active" ? active : past;

  if (isLoading) {
    return (
      <section className="rounded-xl bg-white p-6 shadow-lg sm:p-8">
        <h2 className="text-lg font-semibold text-forest">My Bookings</h2>
        <p className="mt-4 text-sm text-gray-500">Loading bookings...</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl bg-white p-6 shadow-lg sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-forest">My Bookings</h2>
          <p className="mt-1 text-sm text-gray-500">
            {bookings.length} total booking{bookings.length === 1 ? "" : "s"}
          </p>
        </div>
        <Link
          href="/packages"
          className="nav-cta rounded-none border-0 px-4 py-2 text-sm font-semibold text-forest transition-opacity hover:opacity-90"
        >
          Book a Safari
        </Link>
      </div>

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-4 flex gap-1 border-b border-gray-100">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "border-forest text-forest"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1.5 rounded-full bg-gray-100 px-2 py-0.5 text-xs">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {displayed.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-gray-500">
            {activeTab === "upcoming"
              ? "No upcoming bookings."
              : activeTab === "active"
                ? "No active safaris right now."
                : "No past bookings."}
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {displayed.map((booking) => (
            <Link
              key={booking.id}
              href={`/bookings/${booking.id}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-100 p-4 transition-colors hover:border-gray-200 hover:bg-gray-50/50"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate font-medium text-forest">
                    {booking.packageName}
                  </h3>
                  <span
                    className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusStyles[booking.status] || "bg-gray-100 text-gray-600"}`}
                  >
                    {booking.status.replace(/_/g, " ")}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  {booking.travelDate} · {booking.guests} guest{booking.guests === 1 ? "" : "s"}
                </p>
              </div>
              <p className="shrink-0 text-sm font-medium text-forest">
                {format(booking.totalPriceUsd)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
