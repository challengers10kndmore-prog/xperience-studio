#!/usr/bin/env node
/**
 * Cleans and compresses Daniel's 3D model for the hero.
 *
 *   node scripts/prepare-model.mjs path/to/model.glb
 *
 * Writes public/models/daniel.glb: welded, simplified if huge, meshopt-compressed, textures to KTX2
 * (falls back to WebP if the `toktx` tool isn't installed), target under 4 MB.
 * Centring, scaling and dropping floaters also happen at load time (src/three/standIn.ts normaliseModel).
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const input = process.argv[2];
if (!input || !fs.existsSync(input)) { console.error("Usage: node scripts/prepare-model.mjs <model.glb|.gltf|.fbx exported as glb>"); process.exit(1); }
fs.mkdirSync("public/models", { recursive: true });
const out = "public/models/daniel.glb";
const cli = (args) => execFileSync("npx", ["--yes", "@gltf-transform/cli@4", ...args], { stdio: "inherit" });
let hasToktx = true;
try { execFileSync("toktx", ["--version"], { stdio: "ignore" }); } catch { hasToktx = false; }

cli(["optimize", input, out, "--compress", "meshopt", "--texture-compress", hasToktx ? "ktx2" : "webp", "--texture-size", "2048", "--simplify", "true", "--simplify-ratio", "0.5"]);
let size = fs.statSync(out).size;
if (size > 4 * 1024 * 1024) {
  console.log(`  ${(size / 1048576).toFixed(1)} MB, shrinking textures further…`);
  cli(["resize", out, out, "--width", "1024", "--height", "1024"]);
  size = fs.statSync(out).size;
}
console.log(`✓ ${out}: ${(size / 1048576).toFixed(2)} MB${size > 4 * 1024 * 1024 ? " (still over 4 MB: try a lower-poly export)" : ""}`);
