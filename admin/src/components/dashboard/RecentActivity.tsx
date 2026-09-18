"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { callEdgeFunction } from "@/lib/api";

type ActivityItem = {
  type: "booking" | "payment" | "quotation";
  id: number;
  title: string;
  description: string;
  status: string;
  amountUsd: number | null;
  timestamp: string;
};

type ActivityResponse = {
  activity: ActivityItem[];
};

const typeLabels: Record<string, string> = {
  booking: "Booking",
  payment: "Payment",
  quotation: "Quotation",
};

const typeBadgeStyles: Record<string, string> = {
  booking: "bg-blue-100 text-blue-700",
  payment: "bg-green-100 text-green-700",
  quotation: "bg-purple-100 text-purple-700",
};

const statusBadgeStyles: Record<string, string> = {
  inquiry: "bg-blue-50 text-blue-600",
  quote: "bg-purple-50 text-purple-600",
  pending: "bg-orange-50 text-orange-600",
  deposit_required: "bg-yellow-50 text-yellow-600",
  partially_paid: "bg-amber-50 text-amber-600",
  confirmed: "bg-green-50 text-green-600",
  upcoming: "bg-teal-50 text-teal-600",
  in_progress: "bg-indigo-50 text-indigo-600",
  completed: "bg-emerald-50 text-emerald-600",
  cancelled: "bg-gray-50 text-gray-500",
  expired: "bg-gray-50 text-gray-400",
  refunded: "bg-red-50 text-red-600",
  draft: "bg-gray-50 text-gray-500",
  sent: "bg-blue-50 text-blue-600",
  viewed: "bg-purple-50 text-purple-600",
  accepted: "bg-green-50 text-green-600",
  declined: "bg-red-50 text-red-600",
  failed: "bg-red-50 text-red-600",
};

function getTypeHref(item: ActivityItem): string {
  switch (item.type) {
    case "booking":
      return "/bookings";
    case "payment":
      return "/payments";
    case "quotation":
      return `/quotations/${item.id}`;
    default:
      return "/";
  }
}

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function RecentActivity() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadActivity() {
      try {
        const data = await callEdgeFunction<ActivityResponse>("admin/activity?limit=10");
        setActivities(data.activity || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load recent activity.");
      } finally {
        setIsLoading(false);
      }
    }

    loadActivity();
  }, []);

  if (isLoading) {
    return (
      <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-xl font-bold text-forest">Recent Activity</h2>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-xl font-bold text-forest">Recent Activity</h2>
        <p className="text-sm text-red-600">{error}</p>
      </section>
    );
  }

  if (activities.length === 0) {
    return (
      <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-xl font-bold text-forest">Recent Activity</h2>
        <p className="text-sm text-gray-500">No recent activity to display.</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-forest">Recent Activity</h2>
      </div>

      <div className="space-y-1">
        {activities.map((item, idx) => {
          const href = getTypeHref(item);
          const statusStyle = statusBadgeStyles[item.status] || "bg-gray-50 text-gray-500";
          const typeBadge = typeBadgeStyles[item.type] || "bg-gray-100 text-gray-600";

          return (
            <div key={`${item.type}-${item.id}-${idx}`}>
              <Link
                href={href}
                className="flex items-center gap-4 rounded-lg px-3 py-3 transition-colors hover:bg-gray-50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${typeBadge}`}
                    >
                      {typeLabels[item.type]}
                    </span>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${statusStyle}`}
                    >
                      {item.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm font-medium text-forest">
                    {item.title}
                  </p>
                  <p className="truncate text-xs text-gray-500">{item.description}</p>
                </div>

                <div className="flex flex-col items-end gap-1">
                  {item.amountUsd != null && (
                    <span className="text-sm font-medium text-forest">
                      ${item.amountUsd.toLocaleString()}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">
                    {formatTimestamp(item.timestamp)}
                  </span>
                </div>
              </Link>
              {idx < activities.length - 1 && (
                <div className="mx-3 border-b border-gray-100" />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
