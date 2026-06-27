import AdminUsersManager from "@/components/admin-users/AdminUsersManager";

export default function AdminUsersPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-forest">Admin Users</h1>
        <p className="mt-2 text-sm text-gray-500">
          Invite team members to the admin dashboard by email.
        </p>
      </header>

      <AdminUsersManager />
    </div>
  );
}
