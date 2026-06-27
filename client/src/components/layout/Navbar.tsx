import Link from "next/link";
import AuthNav from "@/components/layout/AuthNav";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Packages", href: "/#packages" },
  { label: "About", href: "/#about" },
];

export default function Navbar() {
  return (
    <header className="bg-forest">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 lg:px-8">
        <Link href="/" className="text-lg font-bold tracking-tight text-gold">
          PE Falcon Safaris
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-white/90 transition-colors hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <AuthNav />
      </div>
    </header>
  );
}
