
# Implementation Plan — Hirely AI audit fixes (everything except C1 payments)

Scope: C2–C5, H1–H6, M1–M6 from the audit. Roadmap features are called out at the end for a separate approval — they're each their own multi-day build.

Order is chosen so **security → trust → correctness → polish** — each phase is shippable on its own.

---

## Phase 1 — Backend security & quota (C2, C3)

**Edge functions (`supabase/functions/`)**
- `gap-analysis/index.ts`, `ats-parse-sim/index.ts`: add `getUser()` auth check + `checkEntitlement` + `incrementUsage` (count under `analyses`).
- `resume-builder-ai/index.ts`, `rewrite-improved-answer/index.ts`: add `checkEntitlement` gating on the correct feature key.
- New `_shared/validate.ts`: zod schemas per function; wrap every handler.
- New `_shared/aiFetch.ts`: single wrapper with `AbortController` (30s), `max_tokens` cap, consistent 429/402 mapping, JSON-mode retry. Convert every function to use it.
- `_shared/entitlements.ts`: rewrite `incrementUsage` as an atomic Postgres RPC (`increment_usage(uid, feature, delta)`) using a single `INSERT … ON CONFLICT DO UPDATE SET count = count + delta` — kills the TOCTOU race.
- Wire `resume_uploads` increment into `analyze-resume` (or the upload edge function that stores the file) so the free-plan cap actually enforces.
- Add lightweight per-user rate limit (10 req/min) using a `rate_limits` table keyed by `(user_id, function_name, minute_bucket)`.

**Migration**
- `increment_usage` RPC + `rate_limits` table with RLS (`service_role` only).

---

## Phase 2 — Trust, legal, pricing consistency (H1, H2, H6, C4)

**Landing copy — replace fabricated proof with honest early-stage copy**
- `Stats.tsx`: swap invented numbers for qualitative pillars ("ATS-safe by default", "8 specialised tools", "Built by candidates, for candidates") until we have real data.
- `Hero.tsx:168-186`: remove the fake logo strip + "2,400+ candidates hired" line, or gate behind a `hasRealMetrics` flag defaulting to false.
- `HiredWall.tsx`: replace "Verified outcome" badges with "Illustrative example" until real case studies exist; remove real company logos or add explicit "Candidates from these companies have used Hirely" disclaimer.
- `Testimonials.tsx`: mark placeholder personas as illustrative or hide the section behind an env flag until real ones exist.
- Fix every `href="#"` in `Footer.tsx`, `HiredWall.tsx`, `Navbar.tsx`.

**Pricing consistency**
- Single source of truth in `src/lib/pricing.ts` (monthly, yearly, features, currency).
- `Pricing.tsx` + `FinalCTA.tsx` both read from it — kills the $12 vs $19 contradiction.
- Remove the permanent "was $9 / was $19" fake anchors.
- Precompute yearly price in data, drop the regex-in-render.

**FinalCTA email field (C4)**
- Either make it real: capture into a new `waitlist` table (name-less, `email` unique, RLS insert-only for anon) — or replace the input with a plain "Get started" button. Recommendation: real capture, since it costs nothing and gives you a list.

**Legal pages (Trust page baseline)** — new routes:
- `/privacy`, `/terms`, `/security`, `/cookies` — built with app design tokens, app-owned editable content qualifier, no "verified/certified" language, no absolute compliance claims. I'll need one round of Qs from you before writing (see "Questions before Phase 2" below).

---

## Phase 3 — AI output discipline (H3, H4)

**Discipline pass across all edge functions**
- Set `temperature: 0` on every factual function (`gap-analysis`, `analyze-interview-answer`, `enhance-resume`, `tailor-resume`, `resume-builder-ai`, `rewrite-improved-answer`, `analyze-resume`, `compare-resumes`, `ats-optimize`, `ats-parse-sim`). Keep `0.7–0.95` only on `generate-interview-questions` and `mock-interview`.
- Add `max_tokens` per function (documented per file).
- Model policy in `_shared/models.ts`: `flash-lite` for extraction/classification, `flash` for reasoning/generation. Every function imports from here — no more ad-hoc picks.
- Post-processing keyword-presence guard (like `ats-optimize:196`) added to `gap-analysis` "verbatim quotes" and `compare-resumes` claims — drop unverifiable items before returning.

**Rewrite `ats-parse-sim`**
- Stop pretending to simulate Workday/Taleo byte-level parsing.
- New behaviour: deterministic client-side rule checks (contact-block present, single-column, no tables, standard headings, font/size safe, bullet syntax, dates parseable) + AI adds a *qualitative* summary. Score becomes rule-driven, not hallucinated.

**Sidebar clarity (H4)**
- Group sidebar into 3 clear buckets with subheadings + one-line tooltips: **Analyse** (Resume Analyzer, ATS Parse Sim), **Optimise for a job** (Gap Analysis, ATS Optimizer, Cover Letter, Tailor Resume), **Practice** (Interview Prep), **Build** (Resume Builder).
- Different icon families per bucket so `Target`/`ScanSearch`/`ScanLine` stop clashing.

---

## Phase 4 — Mobile nav + accessibility (H5, M5)

- `Navbar.tsx`: shadcn `Sheet` hamburger for `<md`, contains the same nav links + CTA.
- Heading order pass: bump every `<h4>` under a `<h2>` to `<h3>` in `HowItWorks`, `ResumeCompare`, `Pricing`, `FeatureBlock` where relevant.
- `Hero.tsx`: replace ❌/✅ emoji with `<X aria-hidden />` + `<Check aria-hidden />` lucide icons + off-screen text.
- `FinalCTA` email input: real `<label htmlFor>` + `id` + `name`.
- Contrast: bump `text-foreground/45`–`/55` body copy to `text-muted-foreground` (token) where it's actual reading content; keep the fainter opacity only on decorative captions.
- `MeshGradient`: only ask for device-orientation permission on explicit user gesture, with a small tooltip explaining why (or drop the feature — it adds little).

---

## Phase 5 — Data, persistence, per-user scoping (M3, C5 partial)

**Namespace fixes**
- `src/lib/clientStorage.ts` helper: `scopedKey(uid, key)` for both `localStorage` and `sessionStorage`.
- Convert `lovable.shared_jd` → per-user key. Add same-user check on hydrate.
- New `useLogoutCleanup()` — wipes every `hirely.*` and `lovable.*` key on `SIGNED_OUT`. Called once in `AuthProvider`.

**Persistence tables** (foundation for history/Compare Versions/dashboards)
- `analyses` (id, user_id, kind, input_hash, result jsonb, created_at)
- `cover_letters` (id, user_id, jd_hash, doc jsonb, created_at)
- `gap_reports` (id, user_id, resume_hash, jd_hash, result jsonb, created_at)
- RLS: user_id = auth.uid(); GRANTs to `authenticated` + `service_role`.
- Edge functions write the result before returning; tools show a "History" drawer.

---

## Phase 6 — Consistency polish (M4, M6)

- `PageHeader` on `ResumeAnalyzer` + `CompareResumes` (keep their custom hero blocks *below* the header, not instead of it).
- `EmptyState` on `GapAnalysis`, `AtsOptimizer`, `AtsParseSim`, `InterviewPrep`, `ResumeBuilder` with per-tool faded previews (same pattern we just shipped).
- Unify plan naming: pick one label (recommend **"Hirely Advanced"**), update `PLAN_LABEL`, `Sidebar`, and every marketing string. DB value stays `"advanced"`.
- Replace `confirm()` in `ResumeBuilder.tsx:83` with `AlertDialog`.
- Delete `RoadmapSection.tsx`, `LogoMark`, stray blank lines in `index.html`.
- Remove hardcoded Supabase URL/anon JWT fallback in `vite.config.ts` — fail loudly if env vars missing.
- Deduplicate the two "startup error" UIs (`main.tsx` inline vs `AppErrorBoundary`) — keep the boundary, delete the inline one.
- Add `<StrictMode>` in `main.tsx`.
- Fix `tailwind.config.ts`: remove `./pages/**`/`./components/**` root globs; drop `darkMode` since no dark tokens exist (or add dark tokens — recommend removing until it's a real requirement).

---

## Phase 7 — Perf + SEO (M1, M2)

**Perf**
- Lazy-load `ProductShowcase`, `HiredWall`, `Testimonials`, `Pricing`, `FinalCTA` with `React.lazy` + `Suspense`.
- Pause `MeshGradient` + spark spans when tab hidden (`visibilitychange`) and when component is off-screen (`IntersectionObserver`). Add `content-visibility: auto` to sections below the fold.
- Add `vite-imagetools`; serve avif/webp for any real images.
- `index.html`: `<link rel="preload">` the LCP hero image (once we replace R2 placeholder), self-host Inter (`@fontsource/inter`) instead of Google Fonts network call.

**SEO**
- `index.html`: real `<link rel="icon">`, `<link rel="canonical" href="https://hirely.ai/">`, `<meta name="robots" content="index,follow">`, `og:url`, JSON-LD `Organization` + `SoftwareApplication` blocks.
- Replace R2 og:image with an owned `/public/og.jpg` (1200×630).
- `public/robots.txt` (allow all, ref sitemap) + `public/sitemap.xml` (only public routes: `/`, `/auth`, `/privacy`, `/terms`, `/security`, `/cookies`; no `<lastmod>` — we have no page-specific timestamps to source from).
- Per-route `<title>` + `<meta description>` using `react-helmet-async` on `Auth`, `AuthCallback`, and legal pages.

---

## Phase 8 — Ship the sold-but-unbuilt features (C5)

Two options — I recommend option A because it's contained:

**A) Minimum viable Applications tracker** (1 sold feature, ~1 day of work)
- Table `applications` (user_id, company, role, jd_text, status enum, applied_at, next_step, notes).
- `/app/applications` becomes a real Kanban (shadcn) with `Applied / Interviewing / Offer / Rejected`.
- "Save to Applications" button on Gap Analysis + Cover Letter results.
- Placeholder `Outreach` and `Saved` stay as `EmptyState` with "Building next" — but honest about it.
- **Removes** `voice_mock_interview` and `compare_versions` from `entitlements.ts` + pricing copy until they're built, or explicitly marks them "Coming Q1 2027" in the pricing card.

**B) Everything at once** — I don't recommend this in this plan; each of voice interview, compare versions with history, saved roles, outreach is its own scoped project.

---

## Questions before I start Phase 2 legal pages

Before touching `/privacy`, `/terms`, `/security`, `/cookies` I'll need these from you (I won't invent them):
1. Legal entity name + country of registration (goes on Privacy/Terms).
2. Support / privacy contact email (e.g. `privacy@hirely.ai`).
3. Data retention window for uploaded resumes + generated outputs (e.g. "kept until user deletes account, or 12 months after last activity").
4. Are you comfortable listing subprocessors (Lovable/Supabase, Lovable AI Gateway → Google + OpenAI, whatever email provider)?
5. Any compliance claim you *want* mentioned (GDPR data-subject rights, CCPA, etc.) — I'll only include what you confirm.

I'll ask these as a proper `ask_questions` batch at the start of Phase 2, not now.

---

## Rough time budget (working sessions)

| Phase | Effort |
|---|---|
| 1 Backend security & quota | 1 session |
| 2 Trust / legal / pricing | 1 session + your answers to the 5 questions |
| 3 AI discipline + sidebar | 1 session |
| 4 Mobile nav + a11y | 0.5 session |
| 5 Persistence + scoping | 1 session |
| 6 Consistency polish | 0.5 session |
| 7 Perf + SEO | 0.5 session |
| 8 Applications tracker (option A) | 1 session |

Total: ~6–7 build sessions to land everything.

---

## Approve to proceed

Say **"go"** (or edit anything above) and I'll switch to build mode and start with Phase 1 (backend security). I'll pause at the top of Phase 2 to ask the 5 legal questions before writing customer-facing legal copy.
