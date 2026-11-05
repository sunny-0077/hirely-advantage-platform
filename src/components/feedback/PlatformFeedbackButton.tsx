import { useState } from "react";
import { MessageSquareWarning, Star } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { value: "bug", label: "Bug" },
  { value: "ai_quality", label: "AI Quality" },
  { value: "feature_request", label: "Feature Request" },
  { value: "ux_design", label: "UX/Design" },
] as const;

export function PlatformFeedbackButton() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<string>("bug");
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (rating < 1) { toast.error("Please pick a star rating."); return; }
    if (!message.trim()) { toast.error("Please write a few words."); return; }
    setSaving(true);
    const { error } = await supabase.from("platform_feedback").insert({ user_id: user.id, category, rating, message: message.trim().slice(0, 2000), page_path: window.location.pathname });
    setSaving(false);
    if (error) { toast.error("Couldn't send feedback. Please try again."); return; }
    toast.success("Thanks! Your feedback was sent.");
    setOpen(false); setRating(0); setMessage(""); setCategory("bug");
  }

  return <>
    <button type="button" onClick={() => setOpen(true)} className="flex gap-3 items-center rounded-lg px-3 py-3 text-sm text-muted-foreground hover:text-foreground mb-4 w-full text-left">
      <MessageSquareWarning className="size-4" />Give Feedback / Report Issue
    </button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Give feedback</DialogTitle><DialogDescription>Tell us what's working and what isn't.</DialogDescription></DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          <div className="space-y-2"><Label>Category</Label>
            <div className="grid grid-cols-2 gap-2">{CATEGORIES.map(c => <Button key={c.value} type="button" variant="outline" aria-pressed={category === c.value} className={cn(category === c.value && "border-primary bg-primary/10 text-primary")} onClick={() => setCategory(c.value)}>{c.label}</Button>)}</div>
          </div>
          <div className="space-y-2"><Label>Overall experience</Label>
            <div className="flex gap-1">{[1, 2, 3, 4, 5].map(n => <button key={n} type="button" aria-label={`${n} star${n > 1 ? "s" : ""}`} onClick={() => setRating(n)} className="p-1"><Star className={cn("size-7", n <= rating ? "fill-primary text-primary" : "text-muted-foreground")} /></button>)}</div>
          </div>
          <div className="space-y-2"><Label htmlFor="pf-msg">Your feedback</Label><Textarea id="pf-msg" rows={5} maxLength={2000} value={message} onChange={e => setMessage(e.target.value)} placeholder="What happened, or what would you like to see?" /></div>
          <Button type="submit" className="w-full" disabled={saving}>{saving ? "Sending…" : "Submit feedback"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  </>;
}
