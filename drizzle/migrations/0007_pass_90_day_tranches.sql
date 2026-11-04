ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pass_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS pass_tranches_granted integer NOT NULL DEFAULT 0;
REVOKE UPDATE (pass_started_at, pass_tranches_granted) ON public.profiles FROM authenticated, anon;

ALTER TABLE public.credit_ledger DROP CONSTRAINT IF EXISTS credit_ledger_action_type_check;
ALTER TABLE public.credit_ledger ADD CONSTRAINT credit_ledger_action_type_check CHECK (action_type IN ('resume_tailor','hm_unlock','voice_interview','salary_audit','credit_purchase','refund','signup_bonus','pass_tranche','pass_expired'));

-- Releases due 30-day tranches (50 credits each, 3 max, leftovers carry over) and downgrades expired passes.
CREATE OR REPLACE FUNCTION public.sync_pass_state(_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE p public.profiles; _due int;
BEGIN
  SELECT * INTO p FROM public.profiles WHERE user_id = _user_id FOR UPDATE;
  IF NOT FOUND OR p.plan_tier <> 'pass_90_day' THEN RETURN; END IF;
  IF p.pass_expires_at IS NULL OR p.pass_expires_at <= now() THEN
    UPDATE public.profiles SET plan_tier = 'scout_free' WHERE user_id = _user_id;
    INSERT INTO public.credit_ledger(user_id, action_type, credits_delta) VALUES (_user_id, 'pass_expired', 0);
    RETURN;
  END IF;
  _due := LEAST(3, floor(extract(epoch FROM now() - COALESCE(p.pass_started_at, now())) / (30*86400))::int + 1);
  WHILE p.pass_tranches_granted < _due LOOP
    p.pass_tranches_granted := p.pass_tranches_granted + 1;
    UPDATE public.profiles SET credits_balance = credits_balance + 50, pass_tranches_granted = p.pass_tranches_granted WHERE user_id = _user_id;
    INSERT INTO public.credit_ledger(user_id, action_type, credits_delta) VALUES (_user_id, 'pass_tranche', 50);
  END LOOP;
END $$;

-- Server-only: call after a confirmed purchase. Starts a fresh 90 days from now.
CREATE OR REPLACE FUNCTION public.activate_pass_90_day(_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE public.profiles SET plan_tier = 'pass_90_day', pass_started_at = now(),
    pass_expires_at = now() + interval '90 days', pass_tranches_granted = 0
  WHERE user_id = _user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'profile not found'; END IF;
  PERFORM public.sync_pass_state(_user_id);
END $$;

CREATE OR REPLACE FUNCTION public.sync_my_pass()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  PERFORM public.sync_pass_state(auth.uid());
END $$;

CREATE OR REPLACE FUNCTION public.sync_all_passes()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r record; n int := 0;
BEGIN
  FOR r IN SELECT user_id FROM public.profiles WHERE plan_tier = 'pass_90_day' LOOP
    PERFORM public.sync_pass_state(r.user_id); n := n + 1;
  END LOOP;
  RETURN n;
END $$;

REVOKE ALL ON FUNCTION public.sync_pass_state(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.activate_pass_90_day(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_all_passes() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_pass_state(uuid), public.activate_pass_90_day(uuid), public.sync_all_passes() TO service_role;
REVOKE ALL ON FUNCTION public.sync_my_pass() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_my_pass() TO authenticated;

CREATE OR REPLACE FUNCTION public.spend_credits(_user_id uuid, _action text, _units integer DEFAULT 1)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _cost int := public.credit_cost(_action, _units); _bal int; _id uuid; _recent int;
BEGIN
  IF _cost IS NULL THEN RAISE EXCEPTION 'invalid action: %', _action USING ERRCODE='22023'; END IF;
  IF public.ai_actions_paused() THEN RAISE EXCEPTION 'AI_MAINTENANCE' USING ERRCODE='P0002'; END IF;
  PERFORM public.sync_pass_state(_user_id);
  SELECT credits_balance INTO _bal FROM public.profiles WHERE user_id = _user_id FOR UPDATE;
  IF _action = 'resume_tailor' THEN
    SELECT count(*) INTO _recent FROM public.credit_ledger l
     WHERE l.user_id = _user_id AND l.action_type = 'resume_tailor' AND l.created_at > now() - interval '1 hour'
       AND NOT EXISTS (SELECT 1 FROM public.credit_ledger r WHERE r.refund_of = l.id);
    IF _recent >= 5 THEN RAISE EXCEPTION 'RATE_LIMITED' USING ERRCODE='P0004'; END IF;
  END IF;
  IF _bal IS NULL OR _bal < _cost THEN RAISE EXCEPTION 'INSUFFICIENT_CREDITS' USING ERRCODE='P0003'; END IF;
  UPDATE public.profiles SET credits_balance = credits_balance - _cost WHERE user_id = _user_id;
  INSERT INTO public.credit_ledger(user_id, action_type, credits_delta) VALUES (_user_id, _action, -_cost) RETURNING id INTO _id;
  RETURN _id;
END $function$;