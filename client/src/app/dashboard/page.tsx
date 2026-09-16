"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import { getUser, AuthUser } from "@/lib/auth";
import DashboardBookings from "@/components/dashboard/DashboardBookings";
import DashboardQuotations from "@/components/dashboard/DashboardQuotations";
import PaymentHistory from "@/components/dashboard/PaymentHistory";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const u = await getUser();
      if (!u) {
        router.replace("/login?next=/dashboard");
        return;
      }
      setUser(u);
      setIsLoading(false);
    }
    loadUser();
  }, [router]);

  if (isLoading) {
    return (
      <>
        <Navbar />
        <main className="hero-stripes min-h-[calc(100vh-64px)] py-12 sm:py-16">
          <div className="mx-auto w-full max-w-5xl px-6">
            <p className="text-sm text-white/70">Loading dashboard...</p>
          </div>
        </main>
      </>
    );
  }

  if (!user) return null;

  return (
    <>
      <Navbar />
      <main className="hero-stripes min-h-[calc(100vh-64px)] py-12 sm:py-16">
        <div className="mx-auto w-full max-w-5xl px-6">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-champagne">
              Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-bold text-white">
              Welcome, {user.firstName || "there"}
            </h1>
            <p className="mt-2 text-sm text-white/70">
              Manage your bookings, profile, and payment history.
            </p>
          </div>

          <div className="space-y-6">
            <section className="rounded-xl bg-white p-6 shadow-lg sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-forest">Account</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
                <Link
                  href="/profile"
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-forest transition-colors hover:border-forest"
                >
                  Edit profile
                </Link>
              </div>
            </section>

            <DashboardBookings />

            <DashboardQuotations />

            <PaymentHistory />
          </div>
        </div>
      </main>
    </>
  );
}
