import { createClient } from "@/lib/supabase";

export type AdminUser = {
  id: string;
  username: string;
  role: string;
};

export async function signInAdmin(email: string, password: string) {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  // Check if user is an admin
  const { data: admin, error: adminError } = await supabase
    .from("admins")
    .select("id, username, role")
    .eq("auth_id", data.user.id)
    .eq("status", "active")
    .single();

  if (adminError || !admin) {
    await supabase.auth.signOut();
    throw new Error("Access denied. You are not an admin user.");
  }

  return { session: data.session, admin };
}

export async function signOutAdmin() {
  const supabase = createClient();
  await supabase.auth.signOut();
}

export async function clearAdminSession() {
  const supabase = createClient();
  await supabase.auth.signOut();
}

export async function resetAdminPassword(email: string) {
  const supabase = createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateAdminPassword(newPassword: string) {
  const supabase = createClient();

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function getAdminUser(): Promise<AdminUser | null> {
  const supabase = createClient();

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  // Get admin profile from admins table
  const { data: admin } = await supabase
    .from("admins")
    .select("id, username, role")
    .eq("auth_id", user.id)
    .eq("status", "active")
    .single();

  if (!admin) {
    return null;
  }

  return {
    id: admin.id,
    username: admin.username,
    role: admin.role,
  };
}

export async function getAdminSession() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export function onAdminAuthStateChange(callback: (admin: AdminUser | null) => void) {
  const supabase = createClient();

  return supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      const admin = await getAdminUser();
      callback(admin);
    } else {
      callback(null);
    }
  });
}
