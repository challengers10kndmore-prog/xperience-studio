import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getSupabase } from "@/lib/supabase";

type Row = { day: string; path: string; views: number };

export default function AnalyticsPage() {
  const [days, setDays] = useState(30);
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin", "views", days],
    queryFn: async () => ((await getSupabase().rpc("page_view_stats", { days })).data ?? []) as Row[],
  });
  const { byDay, byPath, total } = useMemo(() => {
    const d = new Map<string, number>(), p = new Map<string, number>();
    let t = 0;
    for (const r of data) { d.set(r.day, (d.get(r.day) ?? 0) + Number(r.views)); p.set(r.path, (p.get(r.path) ?? 0) + Number(r.views)); t += Number(r.views); }
    const series: { day: string; v: number }[] = [];
    for (let i = days - 1; i >= 0; i--) { const k = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10); series.push({ day: k, v: d.get(k) ?? 0 }); }
    return { byDay: series, byPath: [...p.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12), total: t };
  }, [data, days]);
  const max = Math.max(1, ...byDay.map((x) => x.v));
  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <h1 className="font-body text-2xl font-semibold tracking-normal">Page views</h1>
        <div className="inline-flex rounded-lg border border-line p-1">
          {[7, 30, 90].map((d) => <button key={d} onClick={() => setDays(d)} className={`rounded-md px-3 py-1 text-sm ${days === d ? "bg-graphite" : "text-ash"}`}>{d} days</button>)}
        </div>
      </div>
      <Card>
        <CardHeader><CardDescription>Total views, last {days} days</CardDescription><CardTitle className="text-3xl">{isLoading ? "…" : total.toLocaleString()}</CardTitle></CardHeader>
        <CardContent>
          <div className="flex h-40 items-end gap-[2px]" role="img" aria-label={`Daily views over ${days} days`}>
            {byDay.map((x) => <div key={x.day} title={`${x.day}: ${x.v}`} className="flex-1 rounded-t bg-violet/80 transition-all hover:bg-magenta" style={{ height: `${(x.v / max) * 100}%`, minHeight: x.v ? 2 : 0 }} />)}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-ash"><span>{byDay[0]?.day}</span><span>{byDay.at(-1)?.day}</span></div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Top pages</CardTitle></CardHeader>
        <CardContent>
          {byPath.length === 0 ? <p className="text-sm text-ash">No views yet.</p> : (
            <table className="w-full text-sm"><tbody>
              {byPath.map(([path, v]) => <tr key={path} className="border-b border-line/50 last:border-0"><td className="py-2">{path}</td><td className="py-2 text-right tabular-nums">{v}</td></tr>)}
            </tbody></table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
