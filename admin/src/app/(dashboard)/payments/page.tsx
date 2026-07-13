import AdminPaymentsList from "@/components/payments/AdminPaymentsList";

export default function PaymentsPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-forest">Payments</h1>
        <p className="mt-2 text-sm text-gray-500">
          Track mobile money and card payments for safari bookings.
        </p>
      </header>

      <AdminPaymentsList />
    </div>
  );
}
