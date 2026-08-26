"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAdminUser } from "@/lib/auth";

export default function LoginRedirectGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    async function check() {
      const admin = await getAdminUser();
      if (admin) {
        router.replace("/");
      } else {
        setChecked(true);
      }
    }
    check();
  }, [router]);

  if (!checked) {
    return null;
  }

  return <>{children}</>;
}
