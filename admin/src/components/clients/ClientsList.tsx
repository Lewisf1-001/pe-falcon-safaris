"use client";

import { useCallback, useEffect, useState } from "react";
import { API_URL, getAdminAuthHeaders } from "@/lib/api";

export type ClientListItem = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
  bookingCount?: number;
};

type ClientsListProps = {
  onSelectClient: (clientId: number) => void;
  selectedClientId: number | null;
  reloadKey: number;
};

export default function ClientsList({
  onSelectClient,
  selectedClientId,
  reloadKey,
}: ClientsListProps) {
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadClients = useCallback(async (query?: string) => {
    setIsLoading(true);
    setError("");

    try {
      const params = query?.trim() ? `?q=${encodeURIComponent(query.trim())}` : "";
      const response = await fetch(`${API_URL}/api/admin/clients${params}`, {
        headers: getAdminAuthHeaders(),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to load clients.");
        return;
      }

      setClients(data.clients);
    } catch {
      setError("Unable to reach the server. Make sure the API is running.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClients(search);
  }, [loadClients, reloadKey, search]);

  return (
    <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-forest">Client accounts</h2>
          <p className="mt-1 text-sm text-gray-500">
            Search, review, and update customer information.
          </p>
        </div>
        <div className="w-full sm:max-w-xs">
          <label htmlFor="client-search" className="mb-1.5 block text-sm font-medium text-forest">
            Search
          </label>
          <input
            id="client-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name or email"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-forest focus:border-forest focus:outline-none"
          />
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {isLoading ? (
        <p className="mt-6 text-sm text-gray-500">Loading clients...</p>
      ) : clients.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">No clients found.</p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-gray-500">
                <th className="px-2 py-3 font-medium">Name</th>
                <th className="px-2 py-3 font-medium">Email</th>
                <th className="px-2 py-3 font-medium">Status</th>
                <th className="px-2 py-3 font-medium">Bookings</th>
                <th className="px-2 py-3 font-medium">Joined</th>
                <th className="px-2 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr
                  key={client.id}
                  className={`border-b border-gray-50 last:border-0 ${
                    selectedClientId === client.id ? "bg-green-50/60" : ""
                  }`}
                >
                  <td className="px-2 py-4 font-medium text-forest">
                    {client.firstName} {client.lastName}
                  </td>
                  <td className="px-2 py-4 text-gray-600">{client.email}</td>
                  <td className="px-2 py-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                        client.emailVerified
                          ? "bg-green-100 text-green-700"
                          : "bg-orange-100 text-orange-700"
                      }`}
                    >
                      {client.emailVerified ? "Verified" : "Unverified"}
                    </span>
                  </td>
                  <td className="px-2 py-4 text-gray-600">{client.bookingCount ?? 0}</td>
                  <td className="px-2 py-4 text-gray-600">
                    {new Intl.DateTimeFormat("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    }).format(new Date(client.createdAt))}
                  </td>
                  <td className="px-2 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => onSelectClient(client.id)}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-forest transition-colors hover:border-forest"
                    >
                      Manage
                    </button>
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
