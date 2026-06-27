"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAdminToken } from "@/lib/auth";

export default function LoginRedirectGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (getAdminToken()) {
      router.replace("/");
    }
  }, [router]);

  return <>{children}</>;
}
