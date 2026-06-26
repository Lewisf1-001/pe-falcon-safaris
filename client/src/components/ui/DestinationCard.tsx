import Button from "@/components/ui/Button";
import type { Destination } from "@/data/destinations";

type DestinationCardProps = {
  destination: Destination;
};

export default function DestinationCard({ destination }: DestinationCardProps) {
  const { name, duration, region, price, featured } = destination;

  return (
    <article className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="aspect-[4/3] bg-olive" aria-hidden="true" />

      <div className="p-5">
        <h3 className="text-lg font-bold text-forest">{name}</h3>
        <p className="mt-1 text-sm text-gray-500">
          {duration} · {region}
        </p>

        <div className="mt-4 flex items-center justify-between gap-4">
          <span className="text-xl font-bold text-gold">${price}</span>
          <Button
            variant={featured ? "primary" : "outline"}
            href={`#destinations/${destination.id}`}
            className="px-4 py-2 text-sm"
          >
            View Details
          </Button>
        </div>
      </div>
    </article>
  );
}
