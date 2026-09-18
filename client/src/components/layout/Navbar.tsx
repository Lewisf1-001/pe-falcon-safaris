"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AuthNav from "@/components/layout/AuthNav";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Destinations", href: "/destinations" },
  { label: "Packages", href: "/packages" },
  { label: "Trip Builder", href: "/trip-builder" },
  { label: "Contact", href: "/contact" },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  const pathOnly = href.split("#")[0];
  return pathOnly !== "/" && pathname.startsWith(pathOnly);
}

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="border-b border-white/5 bg-forest">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-5 lg:px-10">
        <Link
          href="/"
          className="font-calligraphy shrink-0 text-2xl leading-none text-champagne sm:text-3xl"
        >
          PE Falcon Safaris
        </Link>

        <div className="flex shrink-0 items-center gap-5 lg:gap-8">
          <nav className="hidden items-center gap-6 sm:flex lg:gap-8">
            {navLinks.map((link) => {
              const active = isActivePath(pathname, link.href);

              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`font-display text-[11px] font-medium uppercase tracking-[0.22em] transition-colors duration-300 lg:text-xs ${
                    active
                      ? "text-champagne"
                      : "text-white/55 hover:text-white/90"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <AuthNav />
        </div>
      </div>
    </header>
  );
}
