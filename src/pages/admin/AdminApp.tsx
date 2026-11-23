import { useState } from "react";
import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import {
  BarChart3, Clapperboard, LayoutList, Film, Gauge, HelpCircle, Inbox, LayoutGrid, LogOut, Menu, MessageSquareQuote, Settings, Sparkles, SplitSquareHorizontal, Wrench, ExternalLink,
} from "lucide-react";
import { useAdmin, signOut } from "@/admin/auth";
import { Button } from "@/components/ui/button";
import { XperienceLogo } from "@/components/brand/XperienceLogo";
import { ResourcePage } from "@/admin/components/ResourcePage";
import { resourceByKey } from "@/admin/resources";
import OverviewPage from "@/admin/pages/OverviewPage";
import ProjectsPage from "@/admin/pages/ProjectsPage";
import { SettingsPage, StatsToolsPage } from "@/admin/pages/SettingsPage";
import MessagesPage from "@/admin/pages/MessagesPage";
import AnalyticsPage from "@/admin/pages/AnalyticsPage";
import CustomizePage from "@/admin/pages/CustomizePage";

const NAV = [
  { to: "/admin", label: "Overview", icon: Gauge, end: true },
  { to: "/admin/projects", label: "Projects", icon: Film },
  { to: "/admin/customize", label: "Website customization", icon: LayoutList },
  { to: "/admin/section-media", label: "Section videos", icon: Clapperboard },
  { to: "/admin/brands", label: "Brands", icon: Sparkles },
  { to: "/admin/testimonials", label: "Testimonials", icon: MessageSquareQuote },
  { to: "/admin/services", label: "Services", icon: LayoutGrid },
  { to: "/admin/faqs", label: "FAQs", icon: HelpCircle },
  { to: "/admin/before-after", label: "Before / After", icon: SplitSquareHorizontal },
  { to: "/admin/stats-tools", label: "Stats and tools", icon: Wrench },
  { to: "/admin/settings", label: "Site settings", icon: Settings },
  { to: "/admin/messages", label: "Messages", icon: Inbox },
  { to: "/admin/analytics", label: "Page views", icon: BarChart3 },
];

export default function AdminApp() {
  const state = useAdmin();
  const [menu, setMenu] = useState(false);
  if (state.status === "loading") return <div className="grid min-h-dvh place-items-center bg-void text-ash">Loading…</div>;
  if (state.status === "signed-out") return <Navigate to="/admin/login" replace />;
  if (state.status === "not-admin")
    return (
      <div className="grid min-h-dvh place-items-center bg-void text-center">
        <div className="space-y-4"><p>This account isn't an admin.</p><Button onClick={() => signOut()}>Sign out</Button></div>
      </div>
    );

  return (
    <div className="min-h-dvh bg-void font-body text-chrome md:grid md:grid-cols-[240px_1fr]">
      <title>Admin | Xperience</title>
      <aside className={`${menu ? "block" : "hidden"} border-b border-line bg-carbon md:sticky md:top-0 md:block md:h-dvh md:border-b-0 md:border-r`}>
        <div className="flex items-center gap-2 p-4"><XperienceLogo variant="mark" className="size-8" /><span className="font-label text-[0.65rem] tracking-[0.3em]">ADMIN</span></div>
        <nav className="space-y-0.5 px-2" aria-label="Admin">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setMenu(false)}
              className={({ isActive }) => `flex items-center gap-2.5 rounded-md px-3 py-2 text-sm ${isActive ? "bg-graphite text-chrome" : "text-ash hover:text-chrome"}`}>
              <Icon className="size-4" /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-4 space-y-1 border-t border-line p-2">
          <a href="/" target="_blank" rel="noreferrer" className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-ash hover:text-chrome"><ExternalLink className="size-4" /> View site</a>
          <button onClick={() => signOut()} className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-ash hover:text-chrome"><LogOut className="size-4" /> Sign out</button>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="flex items-center justify-between border-b border-line p-3 md:hidden">
          <XperienceLogo variant="mark" className="size-7" />
          <Button size="icon" variant="ghost" aria-label="Menu" onClick={() => setMenu((m) => !m)}><Menu /></Button>
        </header>
        <main className="mx-auto max-w-5xl p-4 md:p-8">
          <Routes>
            <Route index element={<OverviewPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="customize" element={<CustomizePage />} />
            {["section-media", "brands", "testimonials", "services", "faqs", "before-after"].map((k) => (
              <Route key={k} path={k} element={<ResourcePage res={resourceByKey(k)!} />} />
            ))}
            <Route path="stats-tools" element={<StatsToolsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="messages" element={<MessagesPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </main>
      </div>
      <Toaster theme="dark" position="bottom-right" richColors />
    </div>
  );
}
