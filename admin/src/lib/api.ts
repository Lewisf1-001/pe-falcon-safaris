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

  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();

  if (!response.ok) {
    let errorBody;
    try {
      errorBody = JSON.parse(text);
    } catch {
      errorBody = { error: text || `Edge function ${functionName} failed.` };
    }
    throw new Error(
      errorBody.error || `Edge function ${functionName} failed with status ${response.status}.`
    );
  }

  if (!contentType.includes("application/json")) {
    throw new Error(
      `Edge function ${functionName} returned unexpected content type: ${contentType || "empty"}`
    );
  }

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Edge function ${functionName} returned invalid JSON.`);
  }

  return data as T;
}
