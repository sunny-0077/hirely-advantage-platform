# Roadmap

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
