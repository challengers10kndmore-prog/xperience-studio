import { env, hasSupabase } from "./env";

export type ContactInput = { name: string; email: string; message: string; budget?: string | null };

/** Writes to contact_messages (RLS: anyone may insert, only admins read). */
export async function sendContact(m: ContactInput) {
  const name = m.name.trim().slice(0, 120), email = m.email.trim().slice(0, 200), message = m.message.trim().slice(0, 5000);
  if (!name || !/^\S+@\S+\.\S+$/.test(email) || !message) throw new Error("Please add your name, a valid email and a message.");
  if (!hasSupabase) throw new Error("The form is offline right now. Please use WhatsApp or email.");
  const res = await fetch(`${env.supabaseUrl}/rest/v1/contact_messages`, {
    method: "POST",
    headers: { apikey: env.supabaseKey, Authorization: `Bearer ${env.supabaseKey}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ name, email, message, budget: m.budget?.slice(0, 120) || null, source: "site" }),
  });
  if (!res.ok) throw new Error("Couldn't send right now. Please use WhatsApp or email instead.");
}
