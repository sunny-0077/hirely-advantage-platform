import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { FileText, Trash2, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function SavedResumeVersions() {
  const {user}=useAuth();const qc=useQueryClient();
  const q=useQuery({queryKey:["saved-resume-versions",user?.id],enabled:!!user,queryFn:async()=>{if(!user)return [];const {data,error}=await supabase.from("resume_versions").select("id,name,updated_at,revision").eq("user_id",user.id).order("updated_at",{ascending:false});if(error)throw error;return data;}});
  const remove=async(id:string)=>{if(!user||!confirm("Delete this resume version? Your Master Resume stays unchanged."))return;const {error}=await supabase.from("resume_versions").delete().eq("id",id).eq("user_id",user.id);if(error)return toast.error("Couldn't delete this version.");qc.invalidateQueries({queryKey:["saved-resume-versions"]});};
  return <section className="mb-8"><div className="flex justify-between items-center gap-3 mb-4 flex-wrap"><h2 className="text-lg font-semibold">Resume versions</h2><Button asChild variant="outline" size="sm"><Link to="/app/resume-builder">Resume Templates<ArrowRight className="size-4"/></Link></Button></div>{q.isPending?<p role="status">Loading versions…</p>:q.error?<p role="alert">Couldn't load resume versions. <Button variant="link" onClick={()=>q.refetch()}>Retry</Button></p>:q.data?.length?<div className="divide-y divide-border">{q.data.map(v=><div key={v.id} className="flex items-center gap-3 py-4"><FileText className="size-5 text-primary shrink-0"/><div className="flex-1 min-w-0"><h3 className="text-sm font-semibold break-words">{v.name}</h3><p className="text-xs text-muted-foreground mt-1">{new Date(v.updated_at).toLocaleDateString()} · Revision {v.revision}</p></div><Button asChild size="sm" variant="outline"><Link to={`/app/resume-builder?version=${v.id}`}>Open</Link></Button><Button variant="ghost" size="icon" aria-label={`Delete ${v.name}`} onClick={()=>void remove(v.id)}><Trash2 className="size-4"/></Button></div>)}</div>:<p className="text-sm text-muted-foreground">No saved resume versions yet.</p>}</section>;
}