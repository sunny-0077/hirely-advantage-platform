## ToolIcon component + consistent per-tool colors

### 1. New component: `src/components/dashboard/ToolIcon.tsx`

- Props: `icon: LucideIcon`, `color: "blue" | "lilac" | "blush" | "orange"`, optional `size?: "sm" | "md"` (md default = 40px, sm = 32px for sidebar), optional `className`.
- Internal `COLOR_MAP` with inline `style` bg + icon color (values are outside the current token palette, so use inline hsl strings — kept centralized in this one file so it's still a single source of truth).
- Container: `rounded-xl` (12px), 40×40 (md) / 32×32 (sm), flex-center, subtle inset ring `shadow-[inset_0_0_0_1px_hsl(0_0%_0%/0.04)]`.
- Icon rendered at 20px (md) / 16px (sm), `strokeWidth={2}`.

### 2. New registry: `src/lib/toolMeta.ts`

Single source of truth mapping each tool route to `{ icon, color, label }`:

```text
/app/resume            → FileText,    blue     (Resume Analyzer)
/app/resume-builder    → FilePlus2,   blue     (Resume Builder — shares blue family)
/app/compare           → GitCompare,  lilac    (Compare Resumes)
/app/ats-optimizer     → Target,      orange   (ATS Keyword Optimizer)
/app/gap-analysis      → ScanSearch,  orange   (Job Gap Analysis — orange family)
/app/ats-parse-sim     → ScanLine,    orange   (ATS Parse Simulator)
/app/cover-letter      → Mail,        lilac    (Cover Letter Generator)
/app/interview-prep    → Mic,         blush    (Interview Prep)
```

Only 4 colors exist, so related tools share a family (ATS trio = orange, resume pair = blue, writing tools = lilac, interview = blush). Exported as `TOOL_META` keyed by route, plus a `getToolMeta(pathname)` helper.

### 3. Wire it up

- **Sidebar** (`src/components/dashboard/Sidebar.tsx`): rebuild the `suite` array off `TOOL_META`; replace the plain `<Icon />` with `<ToolIcon icon={meta.icon} color={meta.color} size="sm" />`. Keep the existing active-dot, hover rotation, and layout untouched. Tracking section (Applications/Outreach/Saved) stays as-is — no tool color assigned.
- **PageHeader** (`src/components/dashboard/PageHeader.tsx`): add optional `icon?: LucideIcon` + `iconColor?: ToolColor` props. When present, render `<ToolIcon />` at md size to the left of the eyebrow/title block.
- **Per-page wiring**: in each of the 7 tool pages already using `PageHeader`, pass the matching `icon` + `iconColor` from `TOOL_META`.

### 4. Out of scope

No "activity feed" or "recent history strip" components exist in the codebase yet — nothing else references these tools visually. When those are added later, they'll pull from the same `TOOL_META` registry.

### Technical notes

- Colors live as inline `style={{ backgroundColor, color }}` inside `ToolIcon` because the values are custom (not in `index.css` tokens); centralizing them in one file preserves the single-source-of-truth intent.
- No changes to `tailwind.config.ts` or `index.css`.
- No routing, entitlements, or backend changes.
