# Project implementation rules

- Require a validated signed-in user and completed profile onboarding for dashboard routes, because personal workspaces must not render for signed-out visitors.
- Route signup confirmation to the public Hirely callback and show Verified only after getUser validates email_confirmed_at; keep pending signup credentials in tab memory only to resume the original tab after verification on another origin.
- Run every paid AI action through supabase/functions/_shared/credits.ts runPaidAction, because it enforces the 24h AI spend switch, deducts credits server-side, logs cost, and refunds on failure.
- Plan tier, pass expiry and credit balance are writable only by server functions, because users must not grant themselves credits.
- Job feed ingestion runs only in the ingest-jobs function (admin, service role, or the cron token stored in ingest_job_state), with a lease lock, a 24h spend ceiling below the global switch, and auto-pause on AI 402/403/429, because jobs_catalog is server-written and background AI must not starve paid user actions.
- 90-Day Pass state changes only through the activate_pass_90_day / sync_pass_state database functions (synced on spend, on workspace load, and hourly), because tranche release and expiry must be server-enforced.
- Tailoring uses the chosen uploaded resume, else profiles.master_resume_text, and stores a plain-text tailored_text for document history, because job-feed tailoring must work without an upload.
