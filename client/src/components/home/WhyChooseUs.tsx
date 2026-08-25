import { whyChooseUsItems } from "@/data/whyChooseUs";

export default function WhyChooseUs() {
  return (
    <section id="about" className="bg-cream py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold sm:text-sm">
            Why Choose Us
          </p>
          <h2 className="mt-3 text-3xl font-bold text-forest sm:text-4xl">
            Your Safari, Our Passion
          </h2>
          <p className="mt-4 text-base text-gray-600 sm:text-lg">
            From expert guides to secure bookings, we make every step of your Kenyan adventure
            effortless and unforgettable.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {whyChooseUsItems.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl border border-white/80 bg-white p-8 text-center shadow-sm transition-shadow hover:shadow-md"
            >
              <div
                className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-cream text-3xl"
                aria-hidden="true"
              >
                {item.emoji}
              </div>
              <h3 className="text-lg font-bold text-forest">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-gray-600 sm:text-base">
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
