import AdminQuotationsList from "@/components/quotations/AdminQuotationsList";

export default function QuotationsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-forest">Quotations</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage customer quotations and track responses.
        </p>
      </div>
      <AdminQuotationsList />
    </div>
  );
}
