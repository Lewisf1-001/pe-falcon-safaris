"use client";

import { useCallback, useEffect, useState } from "react";
import { API_URL, getAdminAuthHeaders } from "@/lib/api";

export type AdminListItem = {
  id: string;
  username: string;
  email: string;
  status: "active" | "invited";
  createdAt: string;
};

const statusStyles = {
  active: "bg-green-100 text-green-700",
  invited: "bg-orange-100 text-orange-700",
};

export default function AdminUsersList() {
  const [admins, setAdmins] = useState<AdminListItem[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const loadAdmins = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/admin/users`, {
        headers: getAdminAuthHeaders(),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to load admin users.");
        return;
      }

      setAdmins(data.admins);
    } catch {
      setError("Unable to reach the server. Make sure the API is running.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdmins();
  }, [loadAdmins]);

  async function handleResendInvite(adminId: string) {
    setResendingId(adminId);
    setMessage("");
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/admin/users/${adminId}/resend-invite`, {
        method: "POST",
        headers: getAdminAuthHeaders(),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to resend invite.");
        return;
      }

      setMessage(data.message || "Invite resent successfully.");
    } catch {
      setError("Unable to reach the server. Make sure the API is running.");
    } finally {
      setResendingId(null);
    }
  }

  if (isLoading) {
    return <p className="text-sm text-gray-500">Loading admin users...</p>;
  }

  return (
    <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-forest">Admin users</h2>

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
              <th className="px-2 py-3 font-medium">Username</th>
              <th className="px-2 py-3 font-medium">Email</th>
              <th className="px-2 py-3 font-medium">Status</th>
              <th className="px-2 py-3 font-medium">Joined</th>
              <th className="px-2 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {admins.map((admin) => (
              <tr key={admin.id} className="border-b border-gray-50 last:border-0">
                <td className="px-2 py-4 font-medium text-forest">{admin.username}</td>
                <td className="px-2 py-4 text-gray-600">{admin.email}</td>
                <td className="px-2 py-4">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize ${statusStyles[admin.status]}`}
                  >
                    {admin.status}
                  </span>
                </td>
                <td className="px-2 py-4 text-gray-600">
                  {new Intl.DateTimeFormat("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  }).format(new Date(admin.createdAt))}
                </td>
                <td className="px-2 py-4 text-right">
                  {admin.status === "invited" && (
                    <button
                      type="button"
                      onClick={() => handleResendInvite(admin.id)}
                      disabled={resendingId === admin.id}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-forest transition-colors hover:border-forest disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {resendingId === admin.id ? "Sending..." : "Resend invite"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
