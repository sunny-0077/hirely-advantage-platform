import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
export type ResumeAvailability = { available:boolean; source:"structured"|"legacy"|null; label:string; reason?:string };
export function useResumeSource() {
  const {user}=useAuth();
  return useQuery({queryKey:["resume-availability",user?.id],enabled:Boolean(user),staleTime:0,queryFn:async()=>{
    const {data,error}=await supabase.functions.invoke("resume-availability");
    if(error || data?.error) throw new Error("Couldn't check your saved resume.");
    return data as ResumeAvailability;
  }});
}