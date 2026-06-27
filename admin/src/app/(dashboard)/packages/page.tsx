import PackagesManager from "@/components/packages/PackagesManager";

export default function PackagesPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-forest">Safari Packages</h1>
        <p className="mt-2 text-sm text-gray-500">
          Create and edit packages shown on the public website.
        </p>
      </header>

      <PackagesManager />
    </div>
  );
}
