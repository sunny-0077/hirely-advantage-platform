import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { FileText, Mail, ArrowRight, Upload } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";

export default function WorkspaceHome() {
  const { user } = useAuth();
  const summary = useQuery({ queryKey: ["workspace-summary", user?.id], enabled: Boolean(user), queryFn: async () => {
    if (!user) return { resumes: [], letters: [] };
    const [resumes, letters] = await Promise.all([
      supabase.from("resumes").select("id,file_name,created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("cover_letters").select("id,company,role").eq("user_id", user.id),
    ]);
    if (resumes.error || letters.error) throw resumes.error ?? letters.error;
    return { resumes: resumes.data ?? [], letters: letters.data ?? [] };
  } });
  return <div className="max-w-6xl mx-auto">
    <PageHeader eyebrow="My workspace" title="Your next opportunity starts here." />
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
      {[{ name: "Resumes", value: summary.data?.resumes.length ?? 0, icon: FileText }, { name: "Cover letters", value: summary.data?.letters.length ?? 0, icon: Mail }].map(item => <div key={item.name} className="bg-card border border-border rounded-lg p-5"><item.icon className="size-5 text-muted-foreground mb-4" /><p className="text-3xl font-semibold">{summary.isPending ? "—" : item.value}</p><p className="text-sm text-muted-foreground">{item.name}</p></div>)}
    </div>
    {summary.error && <p role="alert" className="text-destructive mb-5">Couldn't load your documents. <Button variant="link" onClick={() => summary.refetch()}>Retry</Button></p>}
    <div className="flex flex-wrap justify-between items-center gap-4 border-b border-border pb-4"><h2 className="text-xl font-semibold">Recent resumes</h2><Button asChild><Link to="/app/resume"><Upload />Upload resume</Link></Button></div>
    {summary.isPending ? <p className="py-8" role="status">Loading documents…</p> : summary.data?.resumes.length ? <div className="divide-y divide-border">{summary.data.resumes.slice(0, 5).map(resume => <Link key={resume.id} to="/app/resume" className="flex items-center gap-3 py-5"><FileText className="size-5 text-muted-foreground" /><span className="flex-1 break-all">{resume.file_name}</span><ArrowRight className="size-4" /></Link>)}</div> : <div className="py-10"><p className="font-medium">No resumes yet</p><Button asChild variant="link" className="px-0 mt-2"><Link to="/app/resume-builder">Create a resume<ArrowRight /></Link></Button></div>}
    <div className="border-t border-border pt-6 flex flex-wrap gap-3"><Button asChild variant="outline"><Link to="/app/cover-letter"><Mail />Create cover letter</Link></Button></div>
  </div>;
}