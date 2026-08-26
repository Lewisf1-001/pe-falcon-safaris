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
  const [dateLabel, setDateLabel] = useState<string | null>(null);

  useEffect(() => {
    getAdminUser().then((admin) => {
      if (admin?.username) {
        setUsername(admin.username);
      }
    });
    setDateLabel(formatDashboardDate());
  }, []);

  return (
    <p className="mt-2 text-sm text-gray-500">
      {dateLabel ? `${dateLabel} — ` : ""}welcome back, {username}
    </p>
  );
}
