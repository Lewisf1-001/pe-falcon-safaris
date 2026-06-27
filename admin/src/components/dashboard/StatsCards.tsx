import { dashboardStats } from "@/data/dashboard";

export default function StatsCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {dashboardStats.map((stat) => (
        <article
          key={stat.id}
          className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm"
        >
          <p className="text-sm text-gray-500">{stat.label}</p>
          <p className="mt-2 text-3xl font-bold text-forest">{stat.value}</p>
          <p
            className={`mt-2 text-sm ${
              stat.changeTone === "positive" ? "text-green-600" : "text-gray-500"
            }`}
          >
            {stat.change}
          </p>
        </article>
      ))}
    </div>
  );
}
