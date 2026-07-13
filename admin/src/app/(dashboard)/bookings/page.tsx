import AdminBookingsList from "@/components/bookings/AdminBookingsList";

export default function BookingsPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-forest">Bookings</h1>
        <p className="mt-2 text-sm text-gray-500">
          Review client safari reservations and update their status.
        </p>
      </header>

      <AdminBookingsList />
    </div>
  );
}
