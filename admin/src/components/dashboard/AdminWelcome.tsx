"use client";

import { useEffect, useState } from "react";
import { getAdminUser } from "@/lib/auth";

function formatDashboardDate() {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date());
}

export default function AdminWelcome() {
  const [username, setUsername] = useState("Admin");
  const [role, setRole] = useState<string | null>(null);
  const [dateLabel, setDateLabel] = useState<string | null>(null);

  useEffect(() => {
    getAdminUser().then((admin) => {
      if (admin?.username) {
        setUsername(admin.username);
      }
      if (admin?.role) {
        setRole(admin.role);
      }
    });
    setDateLabel(formatDashboardDate());
  }, []);

  const roleLabel = role === "superadmin" ? "Super Admin" : "Admin";

  return (
    <p className="mt-2 text-sm text-gray-500">
      {dateLabel ? `${dateLabel} — ` : ""}welcome back, {username}
      <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
        {roleLabel}
      </span>
    </p>
  );
}
