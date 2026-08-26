import Image from "next/image";
import { whyChooseUsItems } from "@/data/whyChooseUs";

export default function WhyChooseUs() {
  return (
    <section id="why-choose-us" className="relative overflow-hidden py-16 sm:py-20">
      <Image
        src="/images/why-choose-us-safari.jpg"
        alt="Wildlife on the Kenyan savanna at golden hour"
        fill
        priority={false}
        quality={60}
        sizes="(max-width: 768px) 100vw, 1200px"
        className="object-cover object-center"
      />
      <div
        className="absolute inset-0 bg-gradient-to-b from-forest/85 via-forest/80 to-forest/90"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-6xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-champagne sm:text-sm">
            Why Choose Us
          </p>
          <h2 className="font-outfit mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Your Safari, Our Passion
          </h2>
          <p className="mt-4 font-sans text-base text-white/75 sm:text-lg">
            From expert guides to secure bookings, we make every step of your Kenyan adventure
            effortless and unforgettable.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {whyChooseUsItems.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl border border-champagne/20 bg-forest/80 p-8 text-center transition-colors hover:border-champagne/50 sm:bg-forest/70 sm:backdrop-blur-sm"
            >
              <div
                className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-champagne/10 text-3xl"
                aria-hidden="true"
              >
                {item.emoji}
              </div>
              <h3 className="font-outfit text-lg font-bold tracking-tight text-white">
                {item.title}
              </h3>
              <p className="mt-3 font-sans text-sm leading-relaxed text-white/70 sm:text-base">
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
