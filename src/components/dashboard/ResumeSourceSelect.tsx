import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useResumeSource } from "@/hooks/useResumeSource";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
export function ResumeSourceSelect({value,onChange,disabled=false}:{value:string|null;onChange:(value:string|null)=>void;disabled?:boolean}) {
  const {user}=useAuth(); const saved=useResumeSource();
  const uploads=useQuery({queryKey:["resume-source-uploads",user?.id],enabled:Boolean(user),queryFn:async()=>{
    if(!user) return [];
    const {data,error}=await supabase.from("resumes").select("id,file_name").eq("user_id",user.id).order("created_at",{ascending:false});
    if(error) throw error; return data ?? [];
  }});
  return <div className="space-y-2">
    <Label>Career facts source</Label>
    <Select value={value ?? "saved"} onValueChange={v=>onChange(v==="saved" ? null : v)} disabled={disabled}>
      <SelectTrigger aria-label="Career facts source"><SelectValue /></SelectTrigger>
      <SelectContent><SelectItem value="saved">{saved.data?.available ? saved.data.label : "Saved Master Resume"}</SelectItem>{uploads.data?.map(r=><SelectItem key={r.id} value={r.id}>Uploaded: {r.file_name}</SelectItem>)}</SelectContent>
    </Select>
    {saved.isPending && !value && <p role="status" className="text-xs text-muted-foreground">Checking saved resume…</p>}
    {saved.isError && !value && <p role="alert" className="text-xs text-destructive">Couldn't check saved resume. Generation will check it again.</p>}
    {!value && saved.data && !saved.data.available && <p className="text-xs text-destructive">{saved.data.reason} <Link className="underline" to="/app/master-resume">Master Resume</Link></p>}
    {uploads.isError && <p role="alert" className="text-xs text-destructive">Couldn't load uploaded resumes.</p>}
  </div>;
}