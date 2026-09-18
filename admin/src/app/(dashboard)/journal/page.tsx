import JournalManager from "@/components/journal/JournalManager";

export default function JournalPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-forest">Safari Journal</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage journal articles shown on the public website.
        </p>
      </div>
      <JournalManager />
    </div>
  );
}
