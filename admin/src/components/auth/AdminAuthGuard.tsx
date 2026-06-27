"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { clearAdminSession, getAdminToken } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function verifySession() {
      const token = getAdminToken();

      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/admin/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          clearAdminSession();
          router.replace("/login");
          return;
        }

        if (!cancelled) {
          setIsReady(true);
        }
      } catch {
        if (!cancelled) {
          setIsReady(true);
        }
      }
    }

    verifySession();

    return () => {
      cancelled = true;
    };
  }, [router, pathname]);

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream text-sm text-gray-500">
        Checking session...
      </div>
    );
  }

  return <>{children}</>;
}
