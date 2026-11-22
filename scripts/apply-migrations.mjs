#!/usr/bin/env node
/**
 * Applies supabase/migrations/*.sql through the Supabase Management API
 * (for environments where a direct Postgres connection is blocked).
 * Tracks applied files in supabase_migrations.schema_migrations, like the CLI.
 *
 *   node scripts/apply-migrations.mjs            # apply pending
 *   node scripts/apply-migrations.mjs --status   # list
 *
 * Needs SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF in the environment (or .env.local).
 */
import fs from "node:fs";
import path from "node:path";
import { loadEnv } from "./lib/env.mjs";

loadEnv();
const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = process.env.SUPABASE_PROJECT_REF;
if (!token || !ref) {
  console.error("Missing SUPABASE_ACCESS_TOKEN or SUPABASE_PROJECT_REF.");
  process.exit(1);
}

async function query(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`);
  return text ? JSON.parse(text) : [];
}

const dir = path.resolve("supabase/migrations");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

await query(`create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (version text primary key, statements text[], name text);`);
const applied = new Set((await query("select version from supabase_migrations.schema_migrations")).map((r) => r.version));

if (process.argv.includes("--status")) {
  for (const f of files) console.log(`${applied.has(f.split("_")[0]) ? "applied" : "pending"}  ${f}`);
  process.exit(0);
}

for (const f of files) {
  const version = f.split("_")[0];
  if (applied.has(version)) continue;
  const sql = fs.readFileSync(path.join(dir, f), "utf8");
  process.stdout.write(`Applying ${f} ... `);
  const name = f.replace(/^\d+_/, "").replace(/\.sql$/, "");
  await query(`begin;\n${sql}\n;insert into supabase_migrations.schema_migrations (version, name) values ('${version}', '${name.replace(/'/g, "")}');\ncommit;`);
  console.log("done");
}
console.log("Migrations up to date.");
