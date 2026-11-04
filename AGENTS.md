# Project implementation rules

- Require a validated signed-in user and completed profile onboarding for dashboard routes, because personal workspaces must not render for signed-out visitors.
- Route signup confirmation to the public Hirely callback and show Verified only after getUser validates email_confirmed_at; keep pending signup credentials in tab memory only to resume the original tab after verification on another origin.
- Run every paid AI action through supabase/functions/_shared/credits.ts runPaidAction, because it enforces the 24h AI spend switch, deducts credits server-side, logs cost, and refunds on failure.
- Plan tier, pass expiry and credit balance are writable only by server functions, because users must not grant themselves credits.