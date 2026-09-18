import Link from "next/link";
import AdminQuotationsList from "@/components/quotations/AdminQuotationsList";

export default function QuotationsPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-forest">Quotations</h1>
          <p className="mt-2 text-sm text-gray-500">
            Manage customer quotations and track responses.
          </p>
        </div>
        <Link
          href="/quotations/new"
          className="nav-cta shrink-0 rounded-md border-0 px-5 py-2.5 text-sm font-semibold text-forest transition-opacity hover:opacity-90"
        >
          + New quotation
        </Link>
      </header>
      <AdminQuotationsList />
    </div>
  );
}
