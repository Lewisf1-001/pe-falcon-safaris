import WildlifeManager from "@/components/wildlife/WildlifeManager";

export default function WildlifePage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-forest">Wildlife Explorer</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage wildlife species shown on the public website.
        </p>
      </div>
      <WildlifeManager />
    </div>
  );
}
