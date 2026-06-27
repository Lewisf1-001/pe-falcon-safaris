import StatsCards from "@/components/dashboard/StatsCards";
import RecentBookings from "@/components/dashboard/RecentBookings";
import AdminWelcome from "@/components/dashboard/AdminWelcome";

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-forest">Dashboard</h1>
        <AdminWelcome />
      </header>

      <StatsCards />

      <div className="mt-8">
        <RecentBookings />
      </div>
    </div>
  );
}
