/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  readonly VITE_SUPABASE_PROJECT_ID?: string;
  readonly VITE_PUBLIC_SITE_URL?: string;
  readonly VITE_MEDIA_BASE_URL?: string;
  readonly VITE_MEDIA_HOST?: "github" | "r2";
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
