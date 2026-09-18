import DestinationsManager from "@/components/destinations/DestinationsManager";

export default function DestinationsPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-forest">Destinations</h1>
        <p className="mt-2 text-sm text-gray-500">
          Manage safari destinations shown on the public website.
        </p>
      </header>

      <DestinationsManager />
    </div>
  );
}
