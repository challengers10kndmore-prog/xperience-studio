// Loads .env.local (if present) into process.env without overriding values already set.
import fs from "node:fs";
import path from "node:path";

export function loadEnv(file = ".env.local") {
  const p = path.resolve(file);
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/);
    if (m && !process.env[m[1]] && m[2] !== "") process.env[m[1]] = m[2];
  }
}

export function requireEnv(...names) {
  const missing = names.filter((n) => !process.env[n]);
  if (missing.length) {
    console.error(`Missing: ${missing.join(", ")}. Add them to .env.local (node scripts/setup-env.mjs) or the environment.`);
    process.exit(1);
  }
}
