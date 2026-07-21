"use client";

import { useEffect, useState } from "react";
import { dashboardStats } from "@/data/dashboard";
import { API_URL, getAdminAuthHeaders } from "@/lib/api";

export default function StatsCards() {
  const [clientCount, setClientCount] = useState<string | null>(null);

  useEffect(() => {
    async function loadClientStats() {
      try {
        const response = await fetch(`${API_URL}/api/admin/clients/stats`, {
          headers: getAdminAuthHeaders(),
        });
        const data = await response.json();

        if (response.ok) {
          setClientCount(String(data.total));
        }
      } catch {
        // Keep placeholder value when API is unavailable.
      }
    }

    loadClientStats();
  }, []);

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {dashboardStats.map((stat) => (
        <article
          key={stat.id}
          className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm"
        >
          <p className="text-sm text-gray-500">{stat.label}</p>
          <p className="mt-2 text-3xl font-bold text-forest">
            {stat.id === "clients" && clientCount != null ? clientCount : stat.value}
          </p>
          <p
            className={`mt-2 text-sm ${
              stat.changeTone === "positive" ? "text-green-600" : "text-gray-500"
            }`}
          >
            {stat.id === "clients" && clientCount != null ? "Registered accounts" : stat.change}
          </p>
        </article>
      ))}
    </div>
  );
}
