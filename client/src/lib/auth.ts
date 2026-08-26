import { createClient } from "@/lib/supabase";

export type AuthUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  emailVerified: boolean;
};

export async function signUp(data: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}) {
  const supabase = createClient();

  const { data: authData, error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        first_name: data.firstName,
        last_name: data.lastName,
      },
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return authData;
}

export async function signIn(email: string, password: string) {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
}

export async function resetPassword(email: string) {
  const supabase = createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function updatePassword(newPassword: string) {
  const supabase = createClient();

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function getUser(): Promise<AuthUser | null> {
  const supabase = createClient();

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  // Get profile from users table
  const { data: profile } = await supabase
    .from("users")
    .select("first_name, last_name")
    .eq("auth_id", user.id)
    .single();

  return {
    id: user.id,
    firstName: profile?.first_name || user.user_metadata?.first_name || "",
    lastName: profile?.last_name || user.user_metadata?.last_name || "",
    email: user.email || "",
    emailVerified: user.email_confirmed_at !== null,
  };
}

export async function getSession() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export function onAuthStateChange(callback: (user: AuthUser | null) => void) {
  const supabase = createClient();

  return supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      const user = await getUser();
      callback(user);
    } else {
      callback(null);
    }
  });
}

export async function getAuthToken(): Promise<string | null> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const supabase = createClient();

  const { data: { user }, error: getUserError } = await supabase.auth.getUser();
  if (getUserError || !user) {
    throw new Error("You must be logged in.");
  }

  // Re-authenticate with current password
  const { error: reAuthError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: currentPassword,
  });

  if (reAuthError) {
    throw new Error("Current password is incorrect.");
  }

  // Update to new password
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) {
    throw new Error(updateError.message);
  }
}
