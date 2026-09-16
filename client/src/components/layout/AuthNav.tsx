"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthUser, getUser, onAuthStateChange, signOut } from "@/lib/auth";

export default function AuthNav() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    getUser().then(setUser);

    const { data: { subscription } } = onAuthStateChange((u) => {
      setUser(u);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    await signOut();
    setUser(null);
    router.push("/");
    router.refresh();
  }

  if (user) {
    return (
      <div className="flex items-center gap-5">
        <Link
          href="/dashboard"
          className="hidden font-display text-[11px] font-medium uppercase tracking-[0.18em] text-white/55 transition-colors hover:text-white/90 sm:inline lg:text-xs"
        >
          Dashboard
        </Link>
        <Link
          href="/bookings"
          className="hidden font-display text-[11px] font-medium uppercase tracking-[0.18em] text-white/55 transition-colors hover:text-white/90 sm:inline lg:text-xs"
        >
          Bookings
        </Link>
        <Link
          href="/#book"
          className="nav-cta inline-flex items-center justify-center rounded-sm px-5 py-2.5 font-display text-[10px] font-semibold uppercase tracking-[0.18em] text-forest transition-opacity hover:opacity-90 lg:text-[11px]"
        >
          Book a Safari
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="font-display text-[11px] font-medium uppercase tracking-[0.18em] text-white/45 transition-colors hover:text-white/80 lg:text-xs"
        >
          Log out
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-5">
      <Link
        href="/login"
        className="font-display text-[11px] font-medium uppercase tracking-[0.18em] text-white/55 transition-colors hover:text-white/90 lg:text-xs"
      >
        Login
      </Link>
      <Link
        href="/register"
        className="nav-cta inline-flex items-center justify-center rounded-sm px-5 py-2.5 font-display text-[10px] font-semibold uppercase tracking-[0.18em] text-forest transition-opacity hover:opacity-90 lg:text-[11px]"
      >
        Register
      </Link>
    </div>
  );
}
