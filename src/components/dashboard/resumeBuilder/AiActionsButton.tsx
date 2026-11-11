import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export type AiAction =
  | "rewrite_summary"
  | "improve_bullet"
  | "atsify_bullet"
  | "add_keywords"
  | "shorten"
  | "remove_weak"
  | "add_impact";

const LABELS: Record<AiAction, string> = {
  rewrite_summary: "Rewrite summary",
  improve_bullet: "Improve bullet",
  atsify_bullet: "Make ATS-friendly",
  add_keywords: "Add job keywords",
  shorten: "Shorten",
  remove_weak: "Remove weak wording",
  add_impact: "Add measurable impact",
};

export async function runAiAction(
  action: AiAction,
  text: string,
  opts: { role?: string; keywords?: string[] } = {},
): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke("resume-builder-ai", {
    body: { action, text, role: opts.role, keywords: opts.keywords },
  });
  if (error) {
    toast.error(error.message || "AI rewrite failed");
    return null;
  }
  if (!data?.text) {
    toast.error(data?.error || "AI rewrite failed");
    return null;
  }
  return data.text as string;
}

type Variant = "summary" | "bullet";

export function AiActionsButton({
  text,
  variant,
  role,
  onApply,
  size = "sm",
}: {
  text: string;
  variant: Variant;
  role?: string;
  onApply: (next: string) => void;
  size?: "sm" | "xs";
}) {
  const [busy, setBusy] = useState<AiAction | null>(null);

  const run = async (action: AiAction) => {
    if (!text.trim()) {
      toast.error("Add some text first.");
      return;
    }
    if (action === "add_impact") {
      const ok = window.confirm(
        "Add a measurable impact phrase only if the existing text strongly implies one. The AI will not invent numbers — but please review the result before keeping it. Continue?",
      );
      if (!ok) return;
    }
    let keywords: string[] | undefined;
    if (action === "add_keywords") {
      const v = window.prompt("Paste job-description keywords, comma-separated:", "");
      if (!v) return;
      keywords = v.split(",").map((s) => s.trim()).filter(Boolean);
      if (!keywords.length) return;
    }
    setBusy(action);
    const next = await runAiAction(action, text, { role, keywords });
    setBusy(null);
    if (next) onApply(next);
  };

  const items: AiAction[] =
    variant === "summary"
      ? ["rewrite_summary", "shorten", "remove_weak", "add_keywords"]
      : ["improve_bullet", "atsify_bullet", "shorten", "remove_weak", "add_impact", "add_keywords"];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={
            "inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-200 hover:bg-violet-500/15 transition-colors " +
            (size === "xs"
              ? "px-2 py-0.5 text-[10.5px]"
              : "px-2.5 py-1 text-[11.5px]")
          }
        >
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
          <span className="font-medium">AI</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-[11px] uppercase tracking-wider">
          {variant === "summary" ? "Summary" : "Bullet"} actions
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.map((a) => (
          <DropdownMenuItem
            key={a}
            onClick={() => run(a)}
            disabled={busy !== null}
            className="text-[12.5px]"
          >
            {LABELS[a]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
