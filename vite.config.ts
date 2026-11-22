/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes("node_modules")) return undefined;
          if (/three|@react-three|postprocessing|detect-gpu/.test(id)) return "three";
          if (/gsap|lenis/.test(id)) return "motion";
          if (/@supabase/.test(id)) return "supabase";
          if (/@radix-ui|@dnd-kit|sonner/.test(id)) return "admin-ui";
          return undefined;
        },
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "api/**/*.test.ts", "shared/**/*.test.ts"],
    css: false,
  },
});
