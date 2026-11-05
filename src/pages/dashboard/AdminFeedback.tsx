import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { Star, ThumbsDown, ThumbsUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const CATEGORY_LABEL: Record<string, string> = { bug: "Bug", ai_quality: "AI Quality", feature_request: "Feature Request", ux_design: "UX/Design" };
const DOC_LABEL: Record<string, string> = { tailored_resume: "Resume", cover_letter: "Cover Letter", interview_prep: "Interview Prep" };
const fmt = (s: string) => new Date(s).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default function AdminFeedback() {
  const { user } = useAuth();
  const [cat, setCat] = useState("all");
  const admin = useQuery({ queryKey: ["is-admin-page", user?.id], enabled: Boolean(user), queryFn: async () => {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", user!.id).eq("role", "admin").maybeSingle();
    return Boolean(data);
  } });
  const platform = useQuery({ queryKey: ["admin-pf"], enabled: admin.data === true, queryFn: async () => {
    const { data, error } = await supabase.rpc("admin_platform_feedback"); if (error) throw error; return data ?? [];
  } });
  const docs = useQuery({ queryKey: ["admin-df"], enabled: admin.data === true, queryFn: async () => {
    const { data, error } = await supabase.rpc("admin_document_feedback"); if (error) throw error; return data ?? [];
  } });

  if (admin.isPending) return <p role="status">Loading…</p>;
  if (!admin.data) return <Navigate to="/app/home" replace />;

  const pf = (platform.data ?? []).filter(f => cat === "all" || f.category === cat);
  const yes = (docs.data ?? []).filter(d => d.helpful).length;
  const no = (docs.data ?? []).length - yes;

  return <div className="max-w-6xl mx-auto">
    <PageHeader eyebrow="Admin" title="Feedback" description="Everything users have told you, newest first." />
    <Tabs defaultValue="platform">
      <TabsList><TabsTrigger value="platform">Platform Feedback ({platform.data?.length ?? 0})</TabsTrigger><TabsTrigger value="docs">Document Ratings ({docs.data?.length ?? 0})</TabsTrigger></TabsList>

      <TabsContent value="platform" className="space-y-4 mt-4">
        <div className="flex flex-wrap gap-2">
          {["all", ...Object.keys(CATEGORY_LABEL)].map(c => <Button key={c} size="sm" variant={cat === c ? "default" : "outline"} onClick={() => setCat(c)}>{c === "all" ? "All" : CATEGORY_LABEL[c]}</Button>)}
        </div>
        {platform.error && <p role="alert" className="text-destructive">Couldn't load feedback.</p>}
        {platform.isPending ? <p role="status">Loading…</p> : pf.length ? <div className="border border-border rounded-lg bg-card divide-y divide-border">{pf.map(f => <div key={f.id} className="p-4 space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="secondary">{CATEGORY_LABEL[f.category] ?? f.category}</Badge>
            <span className="flex" aria-label={`${f.rating} of 5 stars`}>{[1, 2, 3, 4, 5].map(n => <Star key={n} className={`size-4 ${n <= f.rating ? "fill-primary text-primary" : "text-muted-foreground"}`} />)}</span>
            <span className="font-medium break-all">{f.email ?? f.user_id}</span>
            <span className="text-muted-foreground ml-auto text-xs">{fmt(f.created_at)}</span>
          </div>
          <p className="text-sm whitespace-pre-wrap">{f.message}</p>
          {f.page_path && <p className="text-xs text-muted-foreground">Page: {f.page_path}</p>}
        </div>)}</div> : <p className="text-sm text-muted-foreground py-6">No feedback in this category yet.</p>}
      </TabsContent>

      <TabsContent value="docs" className="space-y-4 mt-4">
        <div className="grid grid-cols-2 gap-4 max-w-md">
          <div className="bg-card border border-border rounded-lg p-4"><ThumbsUp className="size-5 text-success mb-2" /><p className="text-2xl font-semibold">{yes}</p><p className="text-sm text-muted-foreground">Helpful</p></div>
          <div className="bg-card border border-border rounded-lg p-4"><ThumbsDown className="size-5 text-destructive mb-2" /><p className="text-2xl font-semibold">{no}</p><p className="text-sm text-muted-foreground">Not helpful</p></div>
        </div>
        {docs.error && <p role="alert" className="text-destructive">Couldn't load ratings.</p>}
        {docs.isPending ? <p role="status">Loading…</p> : docs.data?.length ? <div className="border border-border rounded-lg bg-card divide-y divide-border">{docs.data.map(d => <div key={d.id} className="p-4 flex flex-wrap items-center gap-3 text-sm">
          {d.helpful ? <ThumbsUp className="size-4 text-success" aria-label="Helpful" /> : <ThumbsDown className="size-4 text-destructive" aria-label="Not helpful" />}
          <Badge variant="secondary">{DOC_LABEL[d.document_type] ?? d.document_type}</Badge>
          <span className="break-all">{d.email ?? d.user_id}</span>
          <span className="flex-1 min-w-[12rem] text-muted-foreground">{d.comment || "No comment"}</span>
          <span className="text-xs text-muted-foreground">{fmt(d.created_at)}</span>
        </div>)}</div> : <p className="text-sm text-muted-foreground py-6">No document ratings yet.</p>}
      </TabsContent>
    </Tabs>
  </div>;
}
