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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

export async function callEdgeFunction<T>(
  functionName: string,
  options: {
    method?: string;
    body?: unknown;
  } = {}
): Promise<T> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Not authenticated.");
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Edge function ${functionName} failed.`);
  }

  return data as T;
}
