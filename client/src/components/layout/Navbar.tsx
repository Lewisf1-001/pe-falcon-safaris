import Link from "next/link";
import Button from "@/components/ui/Button";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Destinations", href: "/#destinations" },
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

        <div className="flex items-center gap-3">
          <Button variant="ghost" href="/login" className="px-4 py-2">
            Login
          </Button>
          <Button variant="primary" href="/register" className="px-4 py-2">
            Register
          </Button>
        </div>
      </div>
    </header>
  );
}
