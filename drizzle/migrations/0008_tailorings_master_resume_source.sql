ALTER TABLE public.resume_tailorings ALTER COLUMN resume_id DROP NOT NULL;
ALTER TABLE public.resume_tailorings ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'upload';
ALTER TABLE public.resume_tailorings ADD COLUMN IF NOT EXISTS job_id uuid;
ALTER TABLE public.resume_tailorings ADD COLUMN IF NOT EXISTS tailored_text text;