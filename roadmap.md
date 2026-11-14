# Roadmap

## Template gallery refinement
- [ ] Align search and category controls above a compact, consistent resume-preview grid using Hirely colors and fonts; keep catalogue search and template selection intact.
- [ ] Verify signed-in browsing, role selection and preview at desktop and mobile sizes.

## Role-specific template styles
- [x] Replace industry buckets with Modern Two-Column, Clean Minimalist, Executive Single-Column, Bold Accent Header and Compact High-Density for every selected role; all share that role's canonical duties/skills and career-level priorities.
- [x] Preserve factual content, original snapshots, hidden/reordered sections, legacy saved layouts, colours/fonts and existing export access; separate occupational archetype from visual style.
- [x] Pass 58 resume tests; verify signed-in Software Engineer, Nurse and Financial Analyst previews, example editing, every style switch, colour/font/visibility changes and account save/reopen; remove the exact temporary saved version. Check 1153px/390px layouts without overflow and all five multipage A4 PDFs (3–4 pages) without dropped entries/footer overlap. The test account's existing upgrade dialog still gates downloads; PDF generation tested directly without permission changes.

## Visual resume engine
- [x] Build six role-adaptive A4 layouts, plus retained classic ATS layout, with clearly separated illustrative previews; title aliases reuse attributed duties/skills for 923 canonical occupations, loaded from CDN on selection.
- [x] Add eight palettes, four font pairings, layout switching, section ordering/visibility and responsive paginated canvas.
- [x] Export the same visual pages to 300-DPI image-based A4 PDF with clickable links; preserve account saves, Master Resume facts and existing export access. PDF text is not selectable; DOCX remains text-based.
- [x] Pass 36 preservation/mapping/pagination tests; verify signed-in editing, six role previews, example editing, layout/colour/font/section changes and account save/reopen. Check two-page flow in every design, exported A4 page images, and 593px/390px layouts with no overflow; remove the exact temporary test version. Existing export-access dialog blocks downloads on the test account, so PDF generation was additionally verified directly in-browser without changing permissions.

- [x] Expand free worldwide job sources: Greenhouse, Lever and Arbeitnow Germany/UK; verified 3,906 scanned, 25 inserted, zero failures and no paused AI. Remotive excluded because its free terms forbid gated listings; every-6h scheduler retained.
- [x] Preserve three onboarding places plus worldwide remote using a shared selector; add Jobs preference editing and verify desktop/mobile selection, 18 tests and real country/city queries. No invented preferences were saved on the requesting account; fresh onboarding completion/save remains unverified.

- [x] Fix fresh Google callback session establishment before dashboard validation; fresh mobile query and fragment returns now reach required onboarding rather than sign-in, with no preloaded browser storage. External Google account selection itself remains unverified.

- [x] Repair mobile email autofill/sign-in validation and queued session races; verified real mobile dashboard entry, sidebar navigation, callback session routing and invalid-login feedback. Full external Google/inbox-link round trips remain unverified without completing those external interactions.

- [x] Inspect existing resume editor, Master Resume storage, exports and occupational data sources; propose the scalable Resume Template Library structure before implementation.
- [x] Build the occupational catalogue, role/level template browser, Master Resume mapping, editing and saved versions: 45,808 titles, 35 industries, 26 career levels and three reusable designs with seven professional blueprints.
- [x] Validate catalogue coverage, search, synonyms, pagination, private version CRUD/revisions and Unicode multi-page PDF/DOCX exports; 34 regression tests passed and temporary test versions removed.
- [x] Verify library browsing, editing, switching and version reopening through the real signed-in desktop/mobile workspace during visual-engine validation; temporary version removed and Master Resume facts unchanged.

- [x] Balance workspace sizing without shrinking body text: compact shared cards and overview tiles, place the home studio beside documents/jobs, retain full-width pages and modest side gutters.

- [x] Reduce unused margins across workspace screens and public sections; widen existing content and tighten form spacing without changing data or functionality. Public desktop/mobile checks and 14 regression tests passed; real workspace visual checks remain blocked by unfinished onboarding.

- [x] Redesign public pages, shared controls and authenticated workspace with the new restrained visual identity; backend, auth, payment and credit handlers unchanged.
- [x] Inspect all public sections at desktop/tablet/mobile sizes, verify illustrative tabs and mobile navigation, inspect sign-in/signup/onboarding, and run 54 existing regression tests. No paid generation or profile saves performed.
- [x] Replace the bright mint accent site-wide with deep emerald (#0B7A52 actions, #E8F4EE tints, #06281C panels); verified in-browser on public pages, sign-in and eight workspace pages at desktop plus phone, no old mint remains, build OK.
- [x] Replace every green site-wide with sky blue (#0369A1 actions, #F0F9FF/#E0F2FE tints, #051E2C panels, #38BDF8 accent text on panels); verified in-browser on landing, pricing, sign-in and seven workspace pages at desktop plus phone — zero green pixels found, all pages rendered real content, build OK. Google's own logo green and the resume-document colour choices left untouched.

- [ ] Inspect real authenticated workspace pages at desktop/mobile sizes; current authorized session redirects to onboarding Personal information (Step 1 of 3). No account switching, invented facts or onboarding bypass.

- [x] Add authenticated PDF/DOCX Master Resume extraction, deterministic mapping, editable review and explicit save without credits or automatic overwrites.
- [x] Run importer tests: 29 Vitest and 12 Deno tests passed; deployed PDF/DOCX extraction, scanned-PDF rejection, unsigned denial, owner-only profile reads and unchanged profile/credits verified.
- [ ] Verify importer desktop/mobile review, real confirmation/save/reload and subsequent generation through the UI; blocked by the requesting account's unfinished onboarding. No onboarding bypass or invented profile data.

- [x] Repair central structured resume resolution, main/Suite generation inputs, source labels and dashboard availability; preserve legacy/uploads and existing credit behavior.
- [x] Run focused checks: 43 Vitest tests and 10 Deno tests passed; deployed missing-resume rejection for all three main tools, unchanged ledger, owner-only profile reads and signed-in onboarding gate verified. No live model output or debit/refund was generated.

- [x] Audit Master Resume sources/toggle and run available checks: 22 automated tests passed, local serialization/truncation checks passed, deployed empty-resume rejection verified. Generation behavior unchanged.
- [ ] Complete live Master Resume save/reload/title-update, three generated-output fact checks and dashboard-warning checks; blocked by the requesting account's unfinished onboarding. Do not bypass onboarding or invent profile facts.

- [x] Authentication/onboarding repairs: validated race-safe sessions, password recovery, resumable three-step profile setup, live logout/session/routing/isolation checks and focused tests.
- [ ] Complete live fresh registration, inbox confirmation, email/password login and recovery-link password update; blocked by a fresh test inbox and accessible published app. No live password was changed.

- [x] Sanitize and cap Gemini resume/job inputs at 4,000 characters; seven guard/credit tests passed, tailoring and ingestion deployed.

- [x] Phase 1A: credits, ledger, usage logs, jobs catalog, $10/24h safety switch, auto-refund (wired into resume tailoring).
- [x] Remove employer hiring pages and wipe hiring data.
- [ ] Permanently drop old hiring tables; blocked until "Execute backward incompatible database migrations" is allowed in Agent permissions.
- [ ] Remove percentage scores from Resume Analyzer, ATS Optimizer, Compare, Gap Analysis, Parse Simulator and Cover Letter screens.
- [ ] Replace Pricing page plan switching with credit purchase; blocked by payment provider.
- [ ] Wire hm_unlock, voice_interview, salary_audit through runPaidAction when those features are built.
- [x] Safety controls: 5 tailorings/hour cap, 5MB PDF/TXT ≤3 pages uploads, friendly AI errors + refunds, full credit history.
- [ ] Verify a fresh email link on public Hirely; blocked because the app is unpublished.
