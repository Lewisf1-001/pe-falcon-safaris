import Button from "@/components/ui/Button";

export default function Hero() {
  return (
    <section className="hero-stripes">
      <div className="mx-auto flex max-w-4xl flex-col items-center px-6 py-24 text-center sm:py-28 lg:py-32">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-white/80 sm:text-sm">
          Kenya&apos;s Premier Safari Experience
        </p>

        <h1 className="mb-5 text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
          Explore Kenya With PE Falcon Safaris
        </h1>

        <p className="mb-10 max-w-2xl text-base text-white/85 sm:text-lg">
          Unforgettable wildlife adventures. Expert guides. Memories for life.
        </p>

        <Button
          variant="primary"
          href="#book"
          className="px-8 py-3 text-base font-semibold"
        >
          Book Your Adventure
        </Button>
      </div>
    </section>
  );
}
