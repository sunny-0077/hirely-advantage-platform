ALTER TABLE public.credit_ledger DROP CONSTRAINT IF EXISTS credit_ledger_action_type_check;
ALTER TABLE public.credit_ledger ADD CONSTRAINT credit_ledger_action_type_check CHECK (action_type IN ('resume_tailor','hm_unlock','voice_interview','salary_audit','credit_purchase','refund','signup_bonus'));

-- Backfill a signup bonus entry for existing users so history adds up
INSERT INTO public.credit_ledger(user_id, action_type, credits_delta, created_at)
SELECT p.user_id, 'signup_bonus', 5, p.created_at FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.credit_ledger l WHERE l.user_id = p.user_id AND l.action_type = 'signup_bonus');

CREATE OR REPLACE FUNCTION public.spend_credits(_user_id uuid, _action text, _units int DEFAULT 1) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _cost int := public.credit_cost(_action, _units); _bal int; _id uuid; _recent int;
BEGIN
  IF _cost IS NULL THEN RAISE EXCEPTION 'invalid action: %', _action USING ERRCODE='22023'; END IF;
  IF public.ai_actions_paused() THEN RAISE EXCEPTION 'AI_MAINTENANCE' USING ERRCODE='P0002'; END IF;
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
END $$;
REVOKE ALL ON FUNCTION public.spend_credits(uuid,text,int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.spend_credits(uuid,text,int) TO service_role;

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, full_name, avatar_url, plan, plan_tier, credits_balance)
  VALUES (NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url', 'free', 'scout_free', 5);
  INSERT INTO public.credit_ledger(user_id, action_type, credits_delta) VALUES (NEW.id, 'signup_bonus', 5);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  INSERT INTO public.usage_counters (user_id) VALUES (NEW.id) ON CONFLICT (user_id, period_start) DO NOTHING;
  RETURN NEW;
END $$;