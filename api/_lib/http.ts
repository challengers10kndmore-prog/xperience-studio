export const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers },
  });

export const err = (status: number, message: string, headers: Record<string, string> = {}) => json({ error: message }, status, headers);

export function envOr(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

export function clientIp(req: Request) {
  return (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
}

export async function readJson<T>(req: Request): Promise<Partial<T>> {
  try { return (await req.json()) as Partial<T>; } catch { return {}; }
}

/** Last path segment, for dynamic [action] routes. */
export const actionOf = (req: Request) => new URL(req.url).pathname.split("/").filter(Boolean).pop() ?? "";

/** Same-origin check for state-changing requests (defence in depth on top of SameSite cookies). */
export function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try { return new URL(origin).host === new URL(req.url).host; } catch { return false; }
}
