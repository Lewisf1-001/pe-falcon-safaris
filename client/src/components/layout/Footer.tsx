import Link from "next/link";

const quickLinks = [
  { label: "Destinations", href: "/destinations" },
  { label: "Wildlife", href: "/wildlife" },
  { label: "Packages", href: "/packages" },
  { label: "Book Now", href: "/#book" },
  { label: "About Us", href: "/#about" },
];

const socialLinks = [
  { label: "Instagram", href: "https://instagram.com" },
  { label: "Facebook", href: "https://facebook.com" },
  { label: "Twitter", href: "https://twitter.com" },
];

export default function Footer() {
  return (
    <footer className="bg-forest text-white">
      <div className="mx-auto max-w-6xl px-6 py-12 lg:px-8">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <h3 className="font-calligraphy text-3xl text-champagne">
              PE Falcon Safaris
            </h3>
            <div className="mt-4 space-y-2 text-sm text-white/85">
              <p>Nairobi, Kenya</p>
              <p>
                <a href="mailto:info@pefalcon.co.ke" className="hover:text-white">
                  info@pefalcon.co.ke
                </a>
              </p>
              <p>
                <a href="tel:+254700000000" className="hover:text-white">
                  +254 700 000 000
                </a>
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-champagne">Quick Links</h3>
            <ul className="mt-4 space-y-2 text-sm text-white/85">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-bold text-champagne">Follow Us</h3>
            <ul className="mt-4 space-y-2 text-sm text-white/85">
              {socialLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="mt-10 border-t border-white/15 pt-6 text-center text-sm text-white/70">
          © 2026 PE Falcon Safaris. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
