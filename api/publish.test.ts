import { verifyAdmin } from "./_lib/supabase";

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s });

describe("verifyAdmin", () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = "https://sb.example.co";
    process.env.SUPABASE_SECRET_KEY = "sk";
  });
  const req = (token?: string) => new Request("https://site/api/publish", { method: "POST", headers: token ? { authorization: `Bearer ${token}` } : {} });

  it("rejects missing token", async () => {
    expect(await verifyAdmin(req(), (() => { throw new Error("no"); }) as unknown as typeof fetch)).toBeNull();
  });
  it("rejects a valid user who is not in admins", async () => {
    const f = (async (u: string) => (u.includes("/auth/v1/user") ? json({ id: "u1" }) : json([]))) as unknown as typeof fetch;
    expect(await verifyAdmin(req("t"), f)).toBeNull();
  });
  it("accepts an admin", async () => {
    const f = (async (u: string) => (u.includes("/auth/v1/user") ? json({ id: "u1", email: "d@x" }) : json([{ user_id: "u1" }]))) as unknown as typeof fetch;
    expect(await verifyAdmin(req("t"), f)).toEqual({ id: "u1", email: "d@x" });
  });
  it("rejects an invalid JWT", async () => {
    const f = (async () => json({ msg: "bad jwt" }, 401)) as unknown as typeof fetch;
    expect(await verifyAdmin(req("t"), f)).toBeNull();
  });
});
