import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import type { ResumeDocument } from "@/lib/resumeBuilder/types";
import { Button } from "@/components/ui/button";

export function PersonalInfoCard({
  doc,
  setDoc,
}: {
  doc: ResumeDocument;
  setDoc: (d: ResumeDocument) => void;
}) {
  const p = doc.content.personal;
  const set = (patch: Partial<typeof p>) =>
    setDoc({ ...doc, content: { ...doc.content, personal: { ...p, ...patch } } });

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-2.5">
      <div className="text-[10.5px] uppercase tracking-[0.18em] text-foreground/50 mb-1">
        Personal information
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input placeholder="Full name" value={p.name} onChange={(e) => set({ name: e.target.value })} />
        <Input
          placeholder="Headline (e.g. Senior Data Analyst)"
          value={p.headline}
          onChange={(e) => set({ headline: e.target.value })}
        />
        <Input placeholder="Email" value={p.email} onChange={(e) => set({ email: e.target.value })} />
        <Input placeholder="Phone" value={p.phone} onChange={(e) => set({ phone: e.target.value })} />
        <Input
          placeholder="Location (City, State)"
          value={p.location}
          onChange={(e) => set({ location: e.target.value })}
          className="col-span-2"
        />
      </div>

      <div className="space-y-1.5 pt-1">
        <div className="text-[10.5px] uppercase tracking-[0.16em] text-foreground/45">
          Links (LinkedIn, portfolio, GitHub)
        </div>
        {p.links.map((l, i) => (
          <div key={i} className="grid grid-cols-[minmax(0,.7fr)_minmax(0,1.3fr)_28px] gap-2">
            <Input
              placeholder="Label"
              value={l.label}
              onChange={(e) =>
                set({ links: p.links.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })
              }
            />
            <Input
              placeholder="https://…"
              value={l.url}
              onChange={(e) =>
                set({ links: p.links.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)) })
              }
            />
            <Button variant="ghost" size="icon" aria-label="Remove contact link"
              onClick={() => set({ links: p.links.filter((_, j) => j !== i) })}
              className="size-7 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm"
          onClick={() => set({ links: [...p.links, { label: "", url: "" }] })}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-foreground/[0.1] bg-foreground/[0.04] text-[11.5px] text-foreground/75 hover:bg-foreground/[0.07]"
        >
          <Plus className="w-3 h-3" /> Add link
        </Button>
      </div>
    </div>
  );
}
