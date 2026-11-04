CREATE OR REPLACE FUNCTION public.credit_cost(_action text, _units integer DEFAULT 1)
 RETURNS integer LANGUAGE sql IMMUTABLE SET search_path TO 'public'
AS $$
  SELECT CASE _action
    WHEN 'resume_tailor' THEN 1
    WHEN 'cover_letter' THEN 1
    WHEN 'interview_prep' THEN 1
    WHEN 'hm_unlock' THEN 3
    WHEN 'voice_interview' THEN 2 * GREATEST(_units,1)
    WHEN 'salary_audit' THEN 2
  END
$$;
ALTER TABLE public.credit_ledger DROP CONSTRAINT IF EXISTS credit_ledger_action_type_check;
ALTER TABLE public.credit_ledger ADD CONSTRAINT credit_ledger_action_type_check CHECK (action_type = ANY (ARRAY['resume_tailor','cover_letter','interview_prep','hm_unlock','voice_interview','salary_audit','credit_purchase','refund','signup_bonus','pass_tranche','pass_expired']));
CREATE TABLE public.interview_prep_guides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  job_id uuid,
  company text,
  role text NOT NULL,
  guide_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  guide_text text NOT NULL,
  model text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.interview_prep_guides TO authenticated;
GRANT ALL ON public.interview_prep_guides TO service_role;
ALTER TABLE public.interview_prep_guides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own guides select" ON public.interview_prep_guides FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own guides insert" ON public.interview_prep_guides FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own guides delete" ON public.interview_prep_guides FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX interview_prep_guides_user_idx ON public.interview_prep_guides(user_id, created_at DESC);