import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useSite } from "@/data/DataProvider";
import { Nav } from "./Nav";
import { Maintenance } from "./Maintenance";
import { trackPageView } from "@/lib/analytics";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

export function SiteLayout() {
  const { maintenance, data } = useSite();
  const { pathname } = useLocation();
  useDocumentMeta({ title: data.settings.seo_title ?? undefined, description: data.settings.seo_description ?? undefined });
  useEffect(() => { trackPageView(pathname); }, [pathname]);

  if (maintenance.enabled && !isAdminPreview()) return <Maintenance message={maintenance.message} />;
  return (
    <>
      <a href="#main" className="sr-only-focusable fixed left-4 top-4 z-[300] rounded bg-violet px-4 py-2 text-white">Skip to content</a>
      <Nav />
      <main id="main">
        <Outlet />
      </main>
    </>
  );
}

function isAdminPreview() {
  try { return Boolean(localStorage.getItem("xp-admin-auth")); } catch { return false; }
}
