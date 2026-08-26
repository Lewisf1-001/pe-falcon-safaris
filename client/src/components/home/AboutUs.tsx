import { aboutUsAchievements, aboutUsReasons } from "@/data/aboutUs";

export default function AboutUs() {
  return (
    <section id="about" className="bg-cream py-16 sm:py-24">
      <div className="mx-auto max-w-4xl px-6 lg:px-8">
        <header className="border-b border-champagne/30 pb-10">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-champagne-deep sm:text-sm">
            About Us
          </p>
          <h2 className="font-outfit mt-3 text-3xl font-bold tracking-tight text-forest sm:text-4xl">
            About PE Falcon Safaris
          </h2>
        </header>

        <div className="mt-10 space-y-8 font-sans text-base leading-relaxed text-gray-700 sm:text-lg">
          <div>
            <h3 className="font-outfit text-2xl font-semibold tracking-tight text-forest sm:text-3xl">
              Discover Kenya Through the Eyes of Experts
            </h3>
            <p className="mt-4">
              At <strong className="font-semibold text-forest">PE Falcon Safaris</strong>, we
              believe every journey should be more than just a trip—it should be an unforgettable
              adventure. We are passionate about showcasing the beauty, wildlife, culture, and
              breathtaking landscapes of Kenya through carefully planned safari experiences that
              create memories to last a lifetime.
            </p>
            <p className="mt-4">
              Whether you&apos;re dreaming of witnessing the Great Migration in the Maasai Mara,
              exploring Amboseli beneath the majestic Mount Kilimanjaro, relaxing along
              Kenya&apos;s pristine coastline, or discovering hidden gems across the country, our
              team is committed to delivering safe, authentic, and personalized travel experiences
              for every traveler.
            </p>
          </div>

          <hr className="border-champagne/30" />

          <div className="grid gap-8 sm:grid-cols-2">
            <article className="rounded-2xl border border-champagne/25 bg-cream-muted/60 p-6 sm:p-8">
              <h3 className="font-outfit text-xl font-bold tracking-tight text-forest sm:text-2xl">
                Our Mission
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-gray-700 sm:text-base">
                To provide exceptional safari experiences that connect travelers with Kenya&apos;s
                natural beauty, wildlife, and diverse cultures while promoting responsible tourism
                and supporting local communities.
              </p>
            </article>

            <article className="rounded-2xl border border-champagne/25 bg-cream-muted/60 p-6 sm:p-8">
              <h3 className="font-outfit text-xl font-bold tracking-tight text-forest sm:text-2xl">
                Our Vision
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-gray-700 sm:text-base">
                To become one of Kenya&apos;s most trusted safari companies by delivering memorable
                adventures, outstanding customer service, and sustainable travel experiences that
                inspire people from around the world.
              </p>
            </article>
          </div>

          <hr className="border-champagne/30" />

          <div>
            <h3 className="font-outfit text-2xl font-semibold tracking-tight text-forest sm:text-3xl">
              What We Have Achieved
            </h3>
            <p className="mt-4">
              Since our inception, PE Falcon Safaris has focused on building a reputation based on
              quality, reliability, and customer satisfaction. Our journey has been marked by
              several key milestones:
            </p>
            <ul className="mt-6 space-y-3">
              {aboutUsAchievements.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm sm:text-base">
                  <span
                    className="mt-2 inline-block h-2 w-2 shrink-0 rounded-full bg-gold"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <hr className="border-champagne/30" />

          <div>
            <h3 className="font-outfit text-2xl font-semibold tracking-tight text-forest sm:text-3xl">
              Why Choose PE Falcon Safaris?
            </h3>
            <div className="mt-8 space-y-6">
              {aboutUsReasons.map((reason) => (
                <article
                  key={reason.id}
                  className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
                >
                  <h4 className="font-outfit text-lg font-bold tracking-tight text-forest sm:text-xl">
                    {reason.title}
                  </h4>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600 sm:text-base">
                    {reason.description}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <hr className="border-champagne/30" />

          <div>
            <h3 className="font-outfit text-2xl font-semibold tracking-tight text-forest sm:text-3xl">
              Our Commitment
            </h3>
            <p className="mt-4">
              At PE Falcon Safaris, our commitment extends beyond organizing tours. We strive to
              create meaningful experiences that allow travelers to connect with nature, appreciate
              Kenya&apos;s rich heritage, and leave with stories worth sharing.
            </p>
            <p className="mt-4">
              Every safari is carefully planned with attention to detail, ensuring comfort, safety,
              reliability, and unforgettable moments throughout your journey.
            </p>
            <p className="mt-4">
              We invite you to explore Kenya with confidence, knowing that every adventure with PE
              Falcon Safaris is guided by professionalism, passion, and a genuine love for travel.
            </p>
            <p className="mt-8 rounded-2xl border border-champagne/30 bg-cream-muted/80 px-6 py-5 text-center font-outfit text-lg font-semibold leading-relaxed text-forest sm:text-xl">
              Your adventure begins with PE Falcon Safaris—where every journey becomes a lifetime
              memory.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
