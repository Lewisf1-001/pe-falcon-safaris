function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-forest">{title}</h1>
        <p className="mt-2 text-sm text-gray-500">This section is coming soon.</p>
      </header>

      <div className="rounded-xl border border-gray-100 bg-white p-8 shadow-sm">
        <p className="text-gray-600">
          The {title.toLowerCase()} management view will be added in a future update.
        </p>
      </div>
    </div>
  );
}

export default function PaymentsPage() {
  return <PlaceholderPage title="Payments" />;
}
