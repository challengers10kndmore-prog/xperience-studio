import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { env, hasSupabase } from "./env";

let client: SupabaseClient<Database> | null = null;

/** Lazily created so the public site can run entirely from manifest.json if Supabase is unreachable. */
export function getSupabase(): SupabaseClient<Database> {
  if (!hasSupabase) throw new Error("Supabase is not configured");
  if (!client) {
    client = createClient<Database>(env.supabaseUrl, env.supabaseKey, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: "xp-admin-auth" },
    });
  }
  return client;
}
