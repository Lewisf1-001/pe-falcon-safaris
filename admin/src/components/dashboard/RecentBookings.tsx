import Link from "next/link";
import { recentBookings, BookingStatus } from "@/data/dashboard";

const statusStyles: Record<BookingStatus, string> = {
  Paid: "bg-green-100 text-green-700",
  Pending: "bg-orange-100 text-orange-700",
};

export default function RecentBookings() {
  return (
    <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-forest">Recent Bookings</h2>
        <Link
          href="/bookings"
          className="rounded-md border border-forest px-4 py-2 text-sm font-medium text-forest transition-colors hover:bg-forest hover:text-white"
        >
          View all
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-gray-500">
              <th className="px-2 py-3 font-medium">Client</th>
              <th className="px-2 py-3 font-medium">Destination</th>
              <th className="px-2 py-3 font-medium">Date</th>
              <th className="px-2 py-3 font-medium">Status</th>
              <th className="px-2 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {recentBookings.map((booking) => (
              <tr key={booking.id} className="border-b border-gray-50 last:border-0">
                <td className="px-2 py-4 font-medium text-forest">{booking.client}</td>
                <td className="px-2 py-4 text-gray-600">{booking.destination}</td>
                <td className="px-2 py-4 text-gray-600">{booking.date}</td>
                <td className="px-2 py-4">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusStyles[booking.status]}`}
                  >
                    {booking.status}
                  </span>
                </td>
                <td className="px-2 py-4 text-right">
                  <Link
                    href={`/bookings/${booking.id}`}
                    className="inline-flex rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-forest transition-colors hover:border-forest"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
