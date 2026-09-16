"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { callEdgeFunction } from "@/lib/api";

type Alert = {
  type: string;
  label: string;
  count: number;
  breakdown?: Record<string, number>;
  href: string;
};

type AlertsResponse = {
  alerts: Alert[];
};

const alertIcons: Record<string, string> = {
  bookings_pending_action: "!",
  quotations_awaiting_response: "~",
  payments_pending: "$",
  quotations_expired: "x",
};

export default function OperationalAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadAlerts() {
      try {
        const data = await callEdgeFunction<AlertsResponse>("admin/alerts");
        setAlerts(data.alerts || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load alerts.");
      } finally {
        setIsLoading(false);
      }
    }

    loadAlerts();
  }, []);

  if (isLoading) {
    return (
      <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-bold text-forest">Requires Attention</h2>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-bold text-forest">Requires Attention</h2>
        <p className="text-sm text-red-600">{error}</p>
      </section>
    );
  }

  if (alerts.length === 0) {
    return (
      <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-bold text-forest">Requires Attention</h2>
        <p className="text-sm text-gray-500">No items requiring attention right now.</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-xl font-bold text-forest">Requires Attention</h2>
      <div className="space-y-3">
        {alerts.map((alert) => {
          const icon = alertIcons[alert.type] || "!";
          const breakdownText = alert.breakdown
            ? Object.entries(alert.breakdown)
                .filter(([, count]) => count > 0)
                .map(([status, count]) => `${count} ${status.replace(/_/g, " ")}`)
                .join(", ")
            : null;

          return (
            <Link
              key={alert.type}
              href={alert.href}
              className="flex items-center justify-between rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 transition-colors hover:border-orange-300 hover:bg-orange-100"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-200 text-sm font-bold text-orange-800">
                  {icon}
                </span>
                <div>
                  <p className="text-sm font-medium text-forest">{alert.label}</p>
                  {breakdownText && (
                    <p className="text-xs text-gray-500">{breakdownText}</p>
                  )}
                </div>
              </div>
              <span className="rounded-full bg-orange-200 px-3 py-1 text-sm font-bold text-orange-800">
                {alert.count}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
