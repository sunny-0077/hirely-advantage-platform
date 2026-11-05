ALTER TABLE public.resume_tailorings
  ADD COLUMN match_label text,
  ADD COLUMN matched_keywords jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN missing_skills jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.applications
  ADD COLUMN job_id uuid,
  ADD COLUMN tailoring_id uuid,
  ADD COLUMN interview_prep_id uuid,
  ADD COLUMN tracker_status text NOT NULL DEFAULT 'preparing' CHECK (tracker_status IN ('preparing','applied','interviewing','offer','rejected')),
  ADD COLUMN app_key text GENERATED ALWAYS AS (lower(btrim(role)) || '|' || lower(btrim(company))) STORED;

CREATE UNIQUE INDEX applications_user_app_key_idx ON public.applications (user_id, app_key);