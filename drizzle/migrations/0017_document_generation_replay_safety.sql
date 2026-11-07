ALTER TABLE public.resume_tailorings ADD COLUMN IF NOT EXISTS request_id uuid;
ALTER TABLE public.cover_letters ADD COLUMN IF NOT EXISTS request_id uuid;
ALTER TABLE public.interview_prep_guides ADD COLUMN IF NOT EXISTS request_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS resume_tailorings_request_unique ON public.resume_tailorings(user_id, request_id) WHERE request_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS cover_letters_request_unique ON public.cover_letters(user_id, request_id) WHERE request_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS interview_prep_guides_request_unique ON public.interview_prep_guides(user_id, request_id) WHERE request_id IS NOT NULL;
COMMENT ON COLUMN public.resume_tailorings.request_id IS 'Replay key for document generation; duplicate saves fail inside the existing refund boundary.';
COMMENT ON COLUMN public.cover_letters.request_id IS 'Replay key for document generation; duplicate saves fail inside the existing refund boundary.';
COMMENT ON COLUMN public.interview_prep_guides.request_id IS 'Replay key for document generation; duplicate saves fail inside the existing refund boundary.';