import StatsCards from "@/components/dashboard/StatsCards";
import RecentActivity from "@/components/dashboard/RecentActivity";
import OperationalAlerts from "@/components/dashboard/OperationalAlerts";
import AdminWelcome from "@/components/dashboard/AdminWelcome";

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-forest">Dashboard</h1>
        <AdminWelcome />
      </header>

      <StatsCards />

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentActivity />
        </div>
        <div>
          <OperationalAlerts />
        </div>
      </div>
    </div>
  );
}
