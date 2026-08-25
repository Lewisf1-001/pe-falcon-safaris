import ClientsManager from "@/components/clients/ClientsManager";

export default function ClientsPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-forest">Clients</h1>
        <p className="mt-2 text-sm text-gray-500">
          Manage customer accounts, keep contact details accurate, and support sign-in issues.
        </p>
      </header>

      <ClientsManager />
    </div>
  );
}
