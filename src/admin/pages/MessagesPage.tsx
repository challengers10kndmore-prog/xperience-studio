import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Mail, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { db } from "../db";

type Msg = { id: string; name: string; email: string; message: string; budget: string | null; source: string | null; is_read: boolean; created_at: string };

export default function MessagesPage() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin", "messages"],
    queryFn: async () => ((await db().from("contact_messages").select("*").order("created_at", { ascending: false }).limit(500)).data ?? []) as Msg[],
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "messages"] });
  return (
    <div className="space-y-5">
      <h1 className="font-body text-2xl font-semibold tracking-normal">Messages</h1>
      {isLoading ? <p className="text-ash">Loading…</p> : data.length === 0 ? <p className="rounded-lg border border-dashed border-line p-8 text-center text-sm text-ash">No messages yet.</p> : (
        <ul className="space-y-3">
          {data.map((m) => (
            <li key={m.id} className={`rounded-xl border p-4 ${m.is_read ? "border-line bg-carbon" : "border-violet/50 bg-violet/5"}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div><p className="font-medium">{m.name} <span className="text-sm text-ash">· {m.email}</span></p>
                  <p className="text-xs text-ash">{new Date(m.created_at).toLocaleString()}{m.budget ? ` · Budget: ${m.budget}` : ""}{m.source ? ` · ${m.source}` : ""}</p></div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" asChild><a href={`mailto:${m.email}?subject=${encodeURIComponent("Re: your project")}`}><Mail /> Reply</a></Button>
                  <Button size="sm" variant="ghost" onClick={async () => { await db().from("contact_messages").update({ is_read: !m.is_read }).eq("id", m.id); refresh(); }}>{m.is_read ? "Mark unread" : "Mark read"}</Button>
                  <Button size="icon" variant="ghost" aria-label="Delete message" onClick={async () => { if (!confirm("Delete this message?")) return; const { error } = await db().from("contact_messages").delete().eq("id", m.id); if (error) toast.error(error.message); refresh(); }}><Trash2 /></Button>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm">{m.message}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
