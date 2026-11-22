#!/usr/bin/env node
// Regenerates src/integrations/supabase/types.ts via the Supabase Management API.
import fs from "node:fs";
import { loadEnv, requireEnv } from "./lib/env.mjs";

loadEnv();
requireEnv("SUPABASE_ACCESS_TOKEN", "SUPABASE_PROJECT_REF");
const res = await fetch(`https://api.supabase.com/v1/projects/${process.env.SUPABASE_PROJECT_REF}/types/typescript?included_schemas=public`, {
  headers: { Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}` },
});
if (!res.ok) { console.error(`HTTP ${res.status}`); process.exit(1); }
const { types } = await res.json();
fs.writeFileSync("src/integrations/supabase/types.ts", types);
console.log("✓ Wrote src/integrations/supabase/types.ts");
