import Link from "next/link";

export default function Hero() {
  return (
    <section className="hero-stripes">
      <div className="mx-auto flex max-w-4xl flex-col items-center px-6 py-24 text-center sm:py-28 lg:py-32">
        <div className="nav-cta px-4 py-1.5 sm:px-6">
          <p className="font-display text-[10px] font-semibold uppercase tracking-[0.28em] text-forest sm:text-xs">
            Kenya · Premier Safaris · Wildlife Adventures
          </p>
        </div>

        <h1 className="font-outfit mt-10 text-5xl font-extralight leading-[1.15] tracking-tight sm:text-6xl lg:text-7xl">
          <span className="block text-white">Explore Kenya.</span>
          <span className="mt-1 block text-champagne">Adventure awaits.</span>
        </h1>

        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
          <Link
            href="#book"
            className="nav-cta inline-flex items-center justify-center rounded-full px-8 py-3 font-display text-xs font-semibold uppercase tracking-[0.18em] text-forest transition-opacity hover:opacity-90"
          >
            Book Your Adventure
          </Link>
          <Link
            href="#why-choose-us"
            className="inline-flex items-center justify-center rounded-full border border-champagne bg-transparent px-8 py-3 font-display text-xs font-semibold uppercase tracking-[0.18em] text-champagne transition-colors hover:bg-champagne hover:text-forest"
          >
            Why Choose Us
          </Link>
        </div>
      </div>
    </section>
  );
}
