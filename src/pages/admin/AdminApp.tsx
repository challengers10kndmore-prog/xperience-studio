import { Navigate } from "react-router-dom";
import { useAdmin, signOut } from "@/admin/auth";
import { Button } from "@/components/ui/button";

export default function AdminApp() {
  const state = useAdmin();
  if (state.status === "loading") return <div className="grid min-h-dvh place-items-center text-ash">Loading…</div>;
  if (state.status === "signed-out") return <Navigate to="/admin/login" replace />;
  if (state.status === "not-admin")
    return (
      <div className="grid min-h-dvh place-items-center text-center">
        <div className="space-y-4"><p>This account isn't an admin.</p><Button onClick={() => signOut()}>Sign out</Button></div>
      </div>
    );
  return <div className="p-8">Admin</div>;
}
