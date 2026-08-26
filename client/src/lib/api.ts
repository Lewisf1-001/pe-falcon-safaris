import { createClient } from "@/lib/supabase";

export function getSupabaseClient() {
  return createClient();
}

export async function apiRequest<T>(
  fn: (supabase: ReturnType<typeof createClient>) => Promise<T>
): Promise<T> {
  const supabase = createClient();
  return fn(supabase);
}
