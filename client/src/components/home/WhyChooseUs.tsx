import { whyChooseUsItems } from "@/data/whyChooseUs";

export default function WhyChooseUs() {
  return (
    <section id="about" className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-forest">Why Choose Us</h2>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {whyChooseUsItems.map((item) => (
            <article
              key={item.id}
              className="rounded-xl border border-gray-100 bg-[#f7f5f0] p-8 text-center shadow-sm"
            >
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-forest" />
              <h3 className="text-lg font-bold text-forest">{item.title}</h3>
              <p className="mt-2 text-sm text-gray-500">{item.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
