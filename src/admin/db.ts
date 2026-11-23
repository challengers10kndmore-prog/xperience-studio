import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";

/** Untyped client for the generic admin screens (column names come from resource configs). */
export const db = () => getSupabase() as unknown as SupabaseClient;

export type AnyRow = Record<string, unknown>;

export const INBOX_LIMIT_BYTES = 1024 * 1024 * 1024;

export async function inboxUsage() {
  const { data, error } = await getSupabase().rpc("inbox_usage");
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return { bytes: Number(row?.bytes ?? 0), files: Number(row?.files ?? 0) };
}
