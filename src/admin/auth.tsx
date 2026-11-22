import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";

export type AdminState =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "not-admin"; session: Session }
  | { status: "admin"; session: Session };

export async function checkIsAdmin(userId: string) {
  const { data, error } = await getSupabase().from("admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

/** Session + admins-table gate. RLS enforces the same rule server-side; this only drives the UI. */
export function useAdmin(): AdminState {
  const [state, setState] = useState<AdminState>({ status: "loading" });
  useEffect(() => {
    const sb = getSupabase();
    let alive = true;
    const resolve = async (session: Session | null) => {
      if (!session) return alive && setState({ status: "signed-out" });
      try {
        const ok = await checkIsAdmin(session.user.id);
        if (alive) setState(ok ? { status: "admin", session } : { status: "not-admin", session });
      } catch {
        if (alive) setState({ status: "not-admin", session });
      }
    };
    sb.auth.getSession().then(({ data }) => resolve(data.session));
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => { void resolve(session); });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);
  return state;
}

export async function signOut() {
  await getSupabase().auth.signOut();
}
