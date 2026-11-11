# Project implementation rules

- Public and authenticated interfaces share semantic CSS tokens and shared control variants; compatibility surface classes remain available without decorative effects so existing tools retain behavior.

- Require a validated signed-in user and completed profile onboarding for dashboard routes, because personal workspaces must not render for signed-out visitors.
- Reuse `profiles` for onboarding and expose `user_profiles` only as a security-invoker identity view; use server-created identities and explicit onboarding completion, because duplicate stores and name-only gates lose reliable progress.
- Accept password updates only on the public recovery route with a validated recovery session; auth state results are generation-guarded, because stale checks must not restore a signed-out workspace.
- Route signup confirmation to the public Hirely callback and show Verified only after getUser validates email_confirmed_at; keep pending signup credentials in tab memory only to resume the original tab after verification on another origin.
- Run every paid AI action through supabase/functions/_shared/credits.ts runPaidAction, because it enforces the 24h AI spend switch, deducts credits server-side, logs cost, and refunds on failure.
- Plan tier, pass expiry and credit balance are writable only by server functions, because users must not grant themselves credits.
- Job feed ingestion runs only in the ingest-jobs function (admin, service role, or the cron token stored in ingest_job_state), with a lease lock, a 24h spend ceiling below the global switch, and auto-pause on AI 402/403/429, because jobs_catalog is server-written and background AI must not starve paid user actions.
- 90-Day Pass state changes only through the activate_pass_90_day / sync_pass_state database functions (synced on spend, on workspace load, and hourly), because tranche release and expiry must be server-enforced.
- Main and Suite career generators resolve user-owned facts through _shared/resume-source.ts before generation: explicit upload, otherwise valid usable profiles.master_resume_json, otherwise labeled legacy text; section-aware selection preserves the input cap without mixing sources.
- Tailoring and job ingestion must build AI document payloads through _shared/ai-input.ts and pair them with its untrusted-data system rule, because formatting removal alone cannot prevent semantic prompt injection and all document sources need the same bounds.
- Paid document functions (tailor, cover letter, interview prep) upsert the My Applications row via _shared/applications.ts keyed on (user_id, app_key = role|company), because the tracker must be filled server-side and never fail the paid action.
- The Master Resume Hub stores structured data in profiles.master_resume_json and only replaces legacy master_resume_text on explicit opt-in; the resume-availability endpoint reuses the generation resolver so dashboard readiness is server validated without changing onboarding.
- Master Resume imports use an authenticated in-memory extraction endpoint with bounded PDF/ZIP parsing and a client-side deterministic review mapper; explicit field choices save through the existing editor, because no parallel storage, AI billing or automatic fact replacement is needed.
- Paid document requests carry a retry key persisted with a user-scoped unique index; completed replays return the saved document, and competing saves fail inside the unchanged refund boundary to avoid retained duplicate charges.
