ALTER TABLE public.credit_ledger DROP CONSTRAINT credit_ledger_action_type_check;
ALTER TABLE public.credit_ledger ADD CONSTRAINT credit_ledger_action_type_check CHECK (action_type = ANY (ARRAY['resume_tailor','cover_letter','interview_prep','hm_unlock','voice_interview','salary_audit','credit_purchase','refund','signup_bonus','pass_tranche','pass_expired','beta_bonus']));
CREATE UNIQUE INDEX credit_ledger_one_beta_bonus ON public.credit_ledger (user_id) WHERE action_type = 'beta_bonus';

CREATE TABLE public.pricing_interest (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text,
  plan_tier text NOT NULL CHECK (plan_tier IN ('starter_pack','pass_90_day')),
  price_inr integer NOT NULL,
  bonus_granted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pricing_interest TO authenticated;
GRANT ALL ON public.pricing_interest TO service_role;
ALTER TABLE public.pricing_interest ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own or admin read pricing interest" ON public.pricing_interest FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.claim_beta_offer(_plan text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _email text; _granted boolean := false; _price integer; _bal integer;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF _plan NOT IN ('starter_pack','pass_90_day') THEN RAISE EXCEPTION 'Unknown plan'; END IF;
  _price := CASE _plan WHEN 'starter_pack' THEN 249 ELSE 899 END;
  SELECT email INTO _email FROM auth.users WHERE id = _uid;
  PERFORM pg_advisory_xact_lock(hashtext('beta_bonus:' || _uid::text));
  IF NOT EXISTS (SELECT 1 FROM public.credit_ledger WHERE user_id = _uid AND action_type = 'beta_bonus') THEN
    INSERT INTO public.credit_ledger (user_id, action_type, credits_delta) VALUES (_uid, 'beta_bonus', 5);
    UPDATE public.profiles SET credits_balance = credits_balance + 5 WHERE user_id = _uid;
    _granted := true;
  END IF;
  INSERT INTO public.pricing_interest (user_id, email, plan_tier, price_inr, bonus_granted) VALUES (_uid, _email, _plan, _price, _granted);
  SELECT credits_balance INTO _bal FROM public.profiles WHERE user_id = _uid;
  RETURN jsonb_build_object('granted', _granted, 'balance', _bal);
END $$;
REVOKE ALL ON FUNCTION public.claim_beta_offer(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_beta_offer(text) TO authenticated;