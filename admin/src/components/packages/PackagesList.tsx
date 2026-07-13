"use client";

import { useCallback, useEffect, useState } from "react";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { API_URL, getAdminAuthHeaders } from "@/lib/api";
import type { SafariPackage } from "@/types/package";

type PackagesListProps = {
  onEdit: (pkg: SafariPackage) => void;
  reloadKey: number;
};

export default function PackagesList({ onEdit, reloadKey }: PackagesListProps) {
  const { currency, convertBetween, formatInCurrency } = useCurrency();
  const [packages, setPackages] = useState<SafariPackage[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadPackages = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/admin/packages`, {
        headers: getAdminAuthHeaders(),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to load packages.");
        return;
      }

      setPackages(data.packages);
    } catch {
      setError("Unable to reach the server. Make sure the API is running.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPackages();
  }, [loadPackages, reloadKey]);

  async function handleDelete(packageId: number, name: string) {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) {
      return;
    }

    setDeletingId(packageId);
    setMessage("");
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/admin/packages/${packageId}`, {
        method: "DELETE",
        headers: getAdminAuthHeaders(),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to delete package.");
        return;
      }

      setMessage(data.message || "Package deleted successfully.");
      await loadPackages();
    } catch {
      setError("Unable to reach the server. Make sure the API is running.");
    } finally {
      setDeletingId(null);
    }
  }

  if (isLoading) {
    return <p className="text-sm text-gray-500">Loading packages...</p>;
  }

  return (
    <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-forest">All packages</h2>

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {message && (
        <p className="mt-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </p>
      )}

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-gray-500">
              <th className="px-2 py-3 font-medium">Package</th>
              <th className="px-2 py-3 font-medium">Duration</th>
              <th className="px-2 py-3 font-medium">Price ({currency})</th>
              <th className="px-2 py-3 font-medium">Status</th>
              <th className="px-2 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {packages.map((pkg) => (
              <tr key={pkg.id} className="border-b border-gray-50 last:border-0">
                <td className="px-2 py-4">
                  <p className="font-medium text-forest">{pkg.name}</p>
                  <p className="text-xs text-gray-500">/{pkg.slug}</p>
                </td>
                <td className="px-2 py-4 text-gray-600">{pkg.duration}</td>
                <td className="px-2 py-4 text-gray-600">
                  {formatInCurrency(
                    convertBetween(pkg.startingPrice, pkg.priceCurrency, currency),
                    currency
                  )}
                </td>
                <td className="px-2 py-4">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                      pkg.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {pkg.isActive ? "Active" : "Hidden"}
                  </span>
                </td>
                <td className="px-2 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(pkg)}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-forest transition-colors hover:border-forest"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(pkg.id, pkg.name)}
                      disabled={deletingId === pkg.id}
                      className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {deletingId === pkg.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
