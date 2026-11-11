import { useEffect, useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type LetterRow = {
  id: string;
  company: string | null;
  role: string | null;
  full_letter: string;
  created_at: string;
  tone: string | null;
};

function snippet(text: string): string {
  const body = text.replace(/^[\s\S]*?\n\n/, ""); // drop header block
  const clean = body.replace(/\s+/g, " ").trim();
  return clean.length > 110 ? clean.slice(0, 108) + "…" : clean;
}

function relDate(iso: string): string {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 86400000;
  if (diff < 1) return "Today";
  if (diff < 2) return "Yesterday";
  if (diff < 7) return `${Math.floor(diff)}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function CoverLetterLibrary({
  userId,
  refreshKey,
  onOpen,
}: {
  userId: string | undefined;
  refreshKey: number;
  onOpen?: (row: LetterRow) => void;
}) {
  const [rows, setRows] = useState<LetterRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("cover_letters")
        .select("id, company, role, full_letter, created_at, tone")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(24);
      if (!cancelled) {
        setRows((data ?? []) as LetterRow[]);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, refreshKey]);

  if (!userId) return null;

  return (
    <div className="mt-8">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
            Library
          </p>
          <h2 className="mt-0.5 text-[16px] font-semibold tracking-tight text-foreground">
            Your past letters
          </h2>
        </div>
        {rows.length > 0 && (
          <span className="text-[11.5px] text-foreground/50 tabular-nums">
            {rows.length} saved
          </span>
        )}
      </div>

      {loading && rows.length === 0 ? (
        <div className="mt-4 flex items-center gap-2 text-[12.5px] text-foreground/50">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Loading letters…
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-foreground/[0.12] px-5 py-8 text-center">
          <FileText className="w-4 h-4 mx-auto text-foreground/40" />
          <p className="mt-2 text-[12.5px] text-foreground/55">
            Generated letters will appear here as a scrollable library.
          </p>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[520px] overflow-y-auto pr-1">
          {rows.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onOpen?.(r)}
              className={cn(
                "group text-left rounded-2xl p-4 transition-all",
                "bg-white/40 dark:bg-white/[0.04] backdrop-blur-md",
                "border border-white/40 dark:border-white/[0.08]",
                "shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(124,58,237,0.10)]",
                "hover:border-violet-400/40 hover:-translate-y-0.5",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-[13.5px] font-semibold tracking-tight text-foreground truncate">
                  {r.company?.trim() || "Untitled company"}
                </p>
                <span className="shrink-0 text-[10px] tracking-[0.14em] uppercase text-foreground/45 font-medium">
                  {relDate(r.created_at)}
                </span>
              </div>
              <p className="mt-0.5 text-[12px] text-foreground/70 truncate">
                {r.role?.trim() || "Role not specified"}
              </p>
              <p className="mt-2.5 text-[12px] leading-[1.55] text-foreground/60 line-clamp-2">
                {snippet(r.full_letter)}
              </p>
              {r.tone && (
                <span className="mt-3 inline-flex items-center text-[10px] font-medium tracking-[0.12em] uppercase px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-700 ring-1 ring-violet-500/20">
                  {r.tone}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
