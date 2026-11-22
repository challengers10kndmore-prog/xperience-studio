#!/usr/bin/env node
/**
 * Makes ADMIN_EMAIL an admin of the Xperience site.
 *
 *   node scripts/make-admin.mjs
 *
 * - Creates the Supabase Auth user if it doesn't exist (email pre-confirmed).
 * - In a terminal, asks you to type a password (hidden) and sets it.
 * - Adds the user to the admins table.
 * Never prints secrets. Needs SUPABASE_URL, SUPABASE_SECRET_KEY, ADMIN_EMAIL.
 */
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { loadEnv, requireEnv } from "./lib/env.mjs";
import { ask, isInteractive } from "./lib/prompt.mjs";

loadEnv();
requireEnv("SUPABASE_URL", "SUPABASE_SECRET_KEY", "ADMIN_EMAIL");
const email = process.env.ADMIN_EMAIL.trim().toLowerCase();
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

async function findUser() {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const u = data.users.find((x) => x.email?.toLowerCase() === email);
    if (u) return u;
    if (data.users.length < 200) return null;
  }
  return null;
}

let password = null;
if (isInteractive()) {
  console.log(`Setting up admin: ${email}`);
  const a = await ask("Choose a password (min 10 characters, Enter to skip): ", { hidden: true });
  if (a) {
    const b = await ask("Type it again: ", { hidden: true });
    if (a !== b) { console.error("Passwords don't match. Nothing changed."); process.exit(1); }
    if (a.length < 10) { console.error("Too short. Use at least 10 characters."); process.exit(1); }
    password = a;
  }
}

let user = await findUser();
if (!user) {
  const { data, error } = await sb.auth.admin.createUser({
    email,
    email_confirm: true,
    password: password ?? crypto.randomBytes(24).toString("base64url"),
  });
  if (error) throw error;
  user = data.user;
  console.log("✓ Created the admin user.");
} else if (password) {
  const { error } = await sb.auth.admin.updateUserById(user.id, { password });
  if (error) throw error;
  console.log("✓ Password updated.");
} else {
  console.log("✓ Admin user already exists.");
}

const { error } = await sb.from("admins").upsert({ user_id: user.id, email }, { onConflict: "user_id" });
if (error) throw error;
console.log("✓ Added to the admins table.");
if (!password) {
  console.log("\nNo password was set here. To choose one, run this in a terminal on your laptop:\n  node scripts/make-admin.mjs\n");
}
