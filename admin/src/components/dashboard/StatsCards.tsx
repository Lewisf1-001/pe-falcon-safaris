"use client";

import { useEffect, useState } from "react";
import { callEdgeFunction } from "@/lib/api";

type DashboardStats = {
  totalBookings: number;
  bookingsByStatus: Record<string, number>;
  totalQuotations: number;
  quotationsByStatus: Record<string, number>;
  totalPayments: number;
  paymentsByStatus: Record<string, number>;
  totalUsers: number;
  totalPackages: number;
  totalRevenue: number;
  totalQuotedValue: number;
};

type StatsResponse = {
  stats: DashboardStats;
};

function formatCurrency(value: number): string {
  if (value >= 1000) {
    const k = value / 1000;
    return `$${k % 1 === 0 ? k : k.toFixed(1)}k`;
  }
  return `$${value}`;
}

export default function StatsCards() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await callEdgeFunction<StatsResponse>("admin/stats");
        setStats(data.stats);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load dashboard stats.");
      } finally {
        setIsLoading(false);
      }
    }

    loadStats();
  }, []);

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
            <div className="mt-3 h-8 w-16 animate-pulse rounded bg-gray-200" />
            <div className="mt-2 h-3 w-32 animate-pulse rounded bg-gray-100" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!stats) return null;

  const activeBookings =
    (stats.bookingsByStatus.confirmed || 0) +
    (stats.bookingsByStatus.upcoming || 0) +
    (stats.bookingsByStatus.in_progress || 0);

  const pendingActions =
    (stats.bookingsByStatus.inquiry || 0) +
    (stats.bookingsByStatus.quote || 0) +
    (stats.bookingsByStatus.pending || 0) +
    (stats.bookingsByStatus.deposit_required || 0);

  const cards = [
    {
      label: "Total Bookings",
      value: String(stats.totalBookings),
      detail: `${activeBookings} active, ${pendingActions} need attention`,
      tone: "muted" as const,
    },
    {
      label: "Total Revenue",
      value: formatCurrency(stats.totalRevenue),
      detail: `${stats.paymentsByStatus.completed || 0} completed payments`,
      tone: "positive" as const,
    },
    {
      label: "Customers",
      value: String(stats.totalUsers),
      detail: `${stats.totalPackages} packages listed`,
      tone: "muted" as const,
    },
    {
      label: "Quoted Value",
      value: formatCurrency(stats.totalQuotedValue),
      detail: `${stats.totalQuotations} total quotations`,
      tone: "muted" as const,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <article
          key={card.label}
          className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm"
        >
          <p className="text-sm text-gray-500">{card.label}</p>
          <p className="mt-2 text-3xl font-bold text-forest">{card.value}</p>
          <p
            className={`mt-2 text-sm ${
              card.tone === "positive" ? "text-green-600" : "text-gray-500"
            }`}
          >
            {card.detail}
          </p>
        </article>
      ))}
    </div>
  );
}
