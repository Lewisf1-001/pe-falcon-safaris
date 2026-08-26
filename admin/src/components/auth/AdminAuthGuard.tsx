"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAdminUser } from "@/lib/auth";

export default function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function verifySession() {
      const admin = await getAdminUser();

      if (!admin) {
        router.replace("/login");
        return;
      }

      if (!cancelled) {
        setIsReady(true);
      }
    }

    verifySession();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream text-sm text-gray-500">
        Checking session...
      </div>
    );
  }

  return <>{children}</>;
}
