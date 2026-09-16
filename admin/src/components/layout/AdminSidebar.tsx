"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import CurrencySwitcher from "@/components/currency/CurrencySwitcher";
import { clearAdminSession, getAdminUser } from "@/lib/auth";
import { useEffect, useState } from "react";

const navItems = [
  { label: "Dashboard", href: "/" },
  { label: "Admin Users", href: "/admin-users" },
  { label: "Clients", href: "/clients" },
  { label: "Bookings", href: "/bookings" },
  { label: "Quotations", href: "/quotations" },
  { label: "Packages", href: "/packages" },
  { label: "Payments", href: "/payments" },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    getAdminUser().then((admin) => {
      if (admin?.username) {
        setUsername(admin.username);
      }
      if (admin?.role) {
        setRole(admin.role);
      }
    });
  }, []);

  function handleLogout() {
    clearAdminSession();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="brand-dark-bg flex w-56 shrink-0 flex-col px-4 py-6 text-white">
      <Link href="/" className="px-3 text-xl font-bold text-champagne">
        PE Falcon
      </Link>

      <nav className="mt-8 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-champagne/15 text-champagne"
                  : "text-white/80 hover:bg-white/5 hover:text-champagne"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-4 border-t border-white/10 pt-4">
        <CurrencySwitcher />
        <div>
          <p className="px-3 text-xs text-white/60">Signed in as</p>
          <p className="px-3 text-sm font-medium text-white">{username}</p>
          {role && (
            <p className="px-3 text-xs text-white/60 capitalize">{role === "superadmin" ? "Super Admin" : "Admin"}</p>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="mt-3 w-full rounded-md px-3 py-2.5 text-left text-sm font-medium text-white/80 transition-colors hover:bg-forest-light/60 hover:text-white"
          >
            Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}
