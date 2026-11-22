import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DataProvider } from "@/data/DataProvider";
import { SiteLayout } from "@/components/site/SiteLayout";
import Home from "@/pages/Home";

const WorkPage = lazy(() => import("@/pages/work/WorkPage"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const AdminApp = lazy(() => import("@/pages/admin/AdminApp"));
const AdminLogin = lazy(() => import("@/pages/admin/AdminLogin"));
const EmergencyAdmin = lazy(() => import("@/pages/admin/EmergencyAdmin"));
const BrandPreview = import.meta.env.DEV ? lazy(() => import("@/pages/BrandPreview")) : null;

const queryClient = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false } } });

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<div className="min-h-dvh bg-void" />}>
          <Routes>
            {BrandPreview && <Route path="/__brand" element={<BrandPreview />} />}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/emergency" element={<EmergencyAdmin />} />
            <Route path="/admin/*" element={<AdminApp />} />
            <Route element={<DataProvider><SiteLayout /></DataProvider>}>
              <Route index element={<Home />} />
              <Route path="/work/:discipline" element={<WorkPage />} />
              <Route path="/work/:discipline/:category" element={<WorkPage />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
