# Project implementation rules

- Require a validated signed-in user and completed profile onboarding for dashboard routes, because personal workspaces must not render for signed-out visitors.
- Keep hiring submissions as server-created snapshots of candidate-owned documents; only the applicant and the listing owner may read them, because employers must never gain access to a candidate's private document library.