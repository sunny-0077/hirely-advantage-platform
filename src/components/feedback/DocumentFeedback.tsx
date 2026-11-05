import { useEffect, useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type FeedbackDocType = "tailored_resume" | "cover_letter" | "interview_prep";

export function DocumentFeedback({ documentId, documentType }: { documentId?: string; documentType: FeedbackDocType }) {
  const { user } = useAuth();
  const [helpful, setHelpful] = useState<boolean | null>(null);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setHelpful(null); setComment(""); setSaved(false);
    if (!user || !documentId) return;
    supabase.from("document_feedback").select("helpful,comment").eq("user_id", user.id).eq("document_id", documentId).eq("document_type", documentType).maybeSingle()
      .then(({ data }) => { if (data) { setHelpful(data.helpful); setComment(data.comment ?? ""); setSaved(true); } });
  }, [user, documentId, documentType]);

  if (!documentId || !user) return null;

  async function save(value: boolean, text = comment) {
    setHelpful(value); setSaving(true);
    const { error } = await supabase.from("document_feedback").upsert(
      { user_id: user!.id, document_id: documentId!, document_type: documentType, helpful: value, comment: text.trim().slice(0, 300) || null },
      { onConflict: "user_id,document_id,document_type" },
    );
    setSaving(false);
    if (error) { toast.error("Couldn't save your feedback."); return; }
    setSaved(true); toast.success("Thanks for the feedback!");
  }

  return <div className="border-t border-border pt-4 mt-2 space-y-3">
    <div className="flex items-center gap-2 flex-wrap">
      <p className="text-sm font-medium flex-1">Was this output helpful?</p>
      <Button size="sm" variant="outline" aria-pressed={helpful === true} disabled={saving} className={cn(helpful === true && "border-primary bg-primary/10 text-primary")} onClick={() => save(true)}><ThumbsUp className="size-4" />Yes</Button>
      <Button size="sm" variant="outline" aria-pressed={helpful === false} disabled={saving} className={cn(helpful === false && "border-destructive bg-destructive/10 text-destructive")} onClick={() => save(false)}><ThumbsDown className="size-4" />No</Button>
    </div>
    {helpful !== null && <form className="flex gap-2" onSubmit={e => { e.preventDefault(); save(helpful); }}>
      <Input aria-label="Optional comment" maxLength={300} value={comment} onChange={e => setComment(e.target.value)} placeholder="Optional: tell us why in one line" />
      <Button size="sm" type="submit" disabled={saving}>{saved && !comment ? "Saved" : "Send"}</Button>
    </form>}
  </div>;
}
