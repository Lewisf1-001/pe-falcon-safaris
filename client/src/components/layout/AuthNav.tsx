"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { AuthUser, clearAuthSession, getAuthUser } from "@/lib/auth";

export default function AuthNav() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setUser(getAuthUser());
  }, []);

  function handleLogout() {
    clearAuthSession();
    setUser(null);
    router.push("/");
    router.refresh();
  }

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <Link
          href="/profile"
          className="hidden text-sm text-white/90 transition-colors hover:text-white sm:inline"
        >
          Hi, {user.firstName}
        </Link>
        <Button variant="ghost" href="/bookings" className="hidden px-4 py-2 sm:inline-flex">
          My bookings
        </Button>
        <Button variant="ghost" href="/profile" className="px-4 py-2 sm:hidden">
          Account
        </Button>
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center justify-center rounded-md border border-white/80 bg-transparent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10"
        >
          Log out
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Button variant="ghost" href="/login" className="px-4 py-2">
        Login
      </Button>
      <Button variant="primary" href="/register" className="px-4 py-2">
        Register
      </Button>
    </div>
  );
}
