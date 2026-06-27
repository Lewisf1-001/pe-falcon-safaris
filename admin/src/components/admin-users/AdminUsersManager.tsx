"use client";

import { useState } from "react";
import InviteAdminForm from "@/components/admin-users/InviteAdminForm";
import AdminUsersList from "@/components/admin-users/AdminUsersList";

export default function AdminUsersManager() {
  const [reloadKey, setReloadKey] = useState(0);

  return (
    <div className="space-y-8">
      <InviteAdminForm onInvited={() => setReloadKey((current) => current + 1)} />
      <AdminUsersList key={reloadKey} />
    </div>
  );
}
