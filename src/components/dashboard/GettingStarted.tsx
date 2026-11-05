import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useEffect } from "react";
import { CheckCircle2, Circle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export function GettingStarted() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["getting-started", user?.id], enabled: Boolean(user),
    queryFn: async () => {
      const uid = user!.id;
      const { data: p } = await supabase.from("profiles").select("master_resume_text,getting_started_dismissed_at").eq("user_id", uid).maybeSingle();
      if (p?.getting_started_dismissed_at) return { dismissed: true, steps: [true, true, true] };
      const head = { count: "exact" as const, head: true };
      const [t, l, g, a] = await Promise.all([
        supabase.from("resume_tailorings").select("id", head).eq("user_id", uid).not("tailored_text", "is", null),
        supabase.from("cover_letters").select("id", head).eq("user_id", uid),
        supabase.from("interview_prep_guides").select("id", head).eq("user_id", uid),
        supabase.from("applications").select("id", head).eq("user_id", uid).or("tracker_status.neq.preparing,notes.not.is.null"),
      ]);
      return { dismissed: false, steps: [(p?.master_resume_text ?? "").trim().length >= 80, (t.count ?? 0) + (l.count ?? 0) + (g.count ?? 0) > 0, (a.count ?? 0) > 0] };
    },
  });

  async function dismiss() {
    if (!user) return;
    qc.setQueryData(["getting-started", user.id], { dismissed: true, steps: [true, true, true] });
    await supabase.from("profiles").update({ getting_started_dismissed_at: new Date().toISOString() }).eq("user_id", user.id);
  }

  const done = q.data?.steps.filter(Boolean).length ?? 0;
  useEffect(() => { if (q.data && !q.data.dismissed && done === 3) void dismiss(); }, [q.data, done]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!q.data || q.data.dismissed || done === 3) return null;
  const items = [
    { label: "Save your Master Resume in My profile", to: "/app/profile" },
    { label: "Generate your first Tailored Resume, Cover Letter or Interview Prep guide", to: "/app/jobs" },
    { label: "Track your job status in Applications", to: "/app/applications" },
  ];
  return <section aria-label="Getting started" className="bg-card border border-primary/30 rounded-lg p-5 mb-6">
    <div className="flex items-start gap-3 mb-3">
      <div className="flex-1"><h2 className="font-semibold">Getting Started (3 Steps)</h2><p className="text-sm text-muted-foreground">{done} of 3 done</p></div>
      <Button size="sm" variant="ghost" onClick={dismiss}><X />Dismiss</Button>
    </div>
    <Progress value={(done / 3) * 100} className="mb-4" aria-label="Getting started progress" />
    <ol className="space-y-2">{items.map((it, i) => { const ok = q.data!.steps[i]; return <li key={it.to} className="flex items-center gap-3 text-sm">
      {ok ? <CheckCircle2 className="size-5 text-success shrink-0" /> : <Circle className="size-5 text-muted-foreground shrink-0" />}
      <span className={ok ? "line-through text-muted-foreground flex-1" : "flex-1"}>Step {i + 1}: {it.label}</span>
      {!ok && <Button asChild size="sm" variant="outline"><Link to={it.to}>Go</Link></Button>}
    </li>; })}</ol>
  </section>;
}
