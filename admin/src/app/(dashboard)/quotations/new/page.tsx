import AdminQuotationForm from "@/components/quotations/AdminQuotationForm";

export default function NewQuotationPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-forest">New Quotation</h1>
        <p className="mt-2 text-sm text-gray-500">
          Create a draft quotation to send to a customer.
        </p>
      </header>
      <AdminQuotationForm />
    </div>
  );
}
