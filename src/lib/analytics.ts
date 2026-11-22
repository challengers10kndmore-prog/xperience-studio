import { env, hasSupabase } from "./env";

let last = "";
/** Minimal, cookie-free page view counter. Fire-and-forget; never blocks or throws. */
export function trackPageView(path: string) {
  if (!hasSupabase || path === last || typeof navigator === "undefined") return;
  if (navigator.webdriver || /^\/admin/.test(path)) return;
  last = path;
  try {
    void fetch(`${env.supabaseUrl}/rest/v1/page_views`, {
      method: "POST",
      keepalive: true,
      headers: { apikey: env.supabaseKey, Authorization: `Bearer ${env.supabaseKey}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ path: path.slice(0, 300), referrer: document.referrer ? document.referrer.slice(0, 500) : null }),
    }).catch(() => {});
  } catch { /* ignore */ }
}
