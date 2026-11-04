CREATE OR REPLACE FUNCTION public.credit_cost(_action text, _units integer DEFAULT 1)
 RETURNS integer LANGUAGE sql IMMUTABLE SET search_path TO 'public'
AS $$
  SELECT CASE _action
    WHEN 'resume_tailor' THEN 1
    WHEN 'cover_letter' THEN 1
    WHEN 'hm_unlock' THEN 3
    WHEN 'voice_interview' THEN 2 * GREATEST(_units,1)
    WHEN 'salary_audit' THEN 2
  END
$$;
ALTER TABLE public.credit_ledger DROP CONSTRAINT IF EXISTS credit_ledger_action_type_check;
ALTER TABLE public.credit_ledger ADD CONSTRAINT credit_ledger_action_type_check CHECK (action_type = ANY (ARRAY['resume_tailor','cover_letter','hm_unlock','voice_interview','salary_audit','credit_purchase','refund','signup_bonus','pass_tranche','pass_expired']));
ALTER TABLE public.cover_letters ADD COLUMN IF NOT EXISTS job_id uuid;