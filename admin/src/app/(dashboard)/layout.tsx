import AdminAuthGuard from "@/components/auth/AdminAuthGuard";
import AdminSidebar from "@/components/layout/AdminSidebar";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AdminAuthGuard>
      <div className="flex min-h-screen">
        <AdminSidebar />
        <main className="min-h-screen flex-1 bg-cream p-6 sm:p-8">{children}</main>
      </div>
    </AdminAuthGuard>
  );
}
