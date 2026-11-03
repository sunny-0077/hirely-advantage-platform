# Project implementation rules

- Require a validated signed-in user and completed profile onboarding for dashboard routes, because personal workspaces must not render for signed-out visitors.
- Route signup confirmation to the public Hirely callback and show Verified only after getUser validates email_confirmed_at; keep pending signup credentials in tab memory only to resume the original tab after verification on another origin.
- Keep hiring submissions as server-created snapshots of candidate-owned documents; only the applicant and the listing owner may read them, because employers must never gain access to a candidate's private document library.