import Link from "next/link";
import { upcomingTours, UpcomingTour } from "@/data/upcomingTours";

const seatsToneStyles: Record<UpcomingTour["seatsTone"], string> = {
  green: "bg-green-100 text-green-700",
  orange: "bg-orange-100 text-orange-700",
  blue: "bg-sky-100 text-sky-700",
};

export default function UpcomingTours() {
  return (
    <section id="book" className="bg-white pb-16 sm:pb-20">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-forest">Upcoming Tours</h2>

        <div className="mt-8 overflow-hidden rounded-xl border border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="bg-forest text-white">
                  <th className="px-5 py-4 font-semibold">Tour Name</th>
                  <th className="px-5 py-4 font-semibold">Date</th>
                  <th className="px-5 py-4 font-semibold">Seats Left</th>
                  <th className="px-5 py-4 font-semibold">Price</th>
                  <th className="px-5 py-4 font-semibold" />
                </tr>
              </thead>
              <tbody>
                {upcomingTours.map((tour) => (
                  <tr key={tour.id} className="border-t border-gray-100 bg-white">
                    <td className="px-5 py-4 font-medium text-forest">{tour.name}</td>
                    <td className="px-5 py-4 text-gray-600">{tour.date}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${seatsToneStyles[tour.seatsTone]}`}
                      >
                        {tour.seatsLeft} left
                      </span>
                    </td>
                    <td className="px-5 py-4 font-semibold text-forest">${tour.price}</td>
                    <td className="px-5 py-4">
                      <Link
                        href="/register"
                        className="inline-flex rounded-md border border-gold bg-gold px-4 py-2 text-sm font-semibold text-forest transition-colors hover:bg-gold-hover"
                      >
                        Book Now
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
