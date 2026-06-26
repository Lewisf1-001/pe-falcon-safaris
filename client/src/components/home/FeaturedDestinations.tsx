import DestinationCard from "@/components/ui/DestinationCard";
import { featuredDestinations } from "@/data/destinations";

export default function FeaturedDestinations() {
  return (
    <section id="destinations" className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="mb-10">
          <h2 className="text-3xl font-bold text-forest">Featured Destinations</h2>
          <p className="mt-2 text-gray-500">Handpicked Kenya safari experiences</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featuredDestinations.map((destination) => (
            <DestinationCard key={destination.id} destination={destination} />
          ))}
        </div>
      </div>
    </section>
  );
}
