ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS city_hub text NOT NULL DEFAULT 'Bengaluru',
  ADD COLUMN IF NOT EXISTS master_resume_text text,
  ADD COLUMN IF NOT EXISTS master_resume_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS plan_tier text NOT NULL DEFAULT 'scout_free',
  ADD COLUMN IF NOT EXISTS pass_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS credits_balance integer NOT NULL DEFAULT 5;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_plan_tier_check CHECK (plan_tier IN ('scout_free','starter_pack','pass_90_day'));
ALTER TABLE public.profiles ADD CONSTRAINT profiles_city_hub_check CHECK (city_hub IN ('Bengaluru','Hyderabad','Pune','Mumbai','Delhi NCR','Remote'));
ALTER TABLE public.profiles ADD CONSTRAINT profiles_credits_nonneg CHECK (credits_balance >= 0);
UPDATE public.profiles SET full_name = display_name WHERE full_name IS NULL;
COMMENT ON COLUMN public.profiles.plan IS 'DEPRECATED: replaced by plan_tier';
COMMENT ON COLUMN public.profiles.display_name IS 'DEPRECATED: replaced by full_name';

-- Users may edit their own details but never their plan, pass or credits.
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (display_name, full_name, avatar_url, headline, skills, education, experience, city_hub, master_resume_text, master_resume_json) ON public.profiles TO authenticated;

CREATE TABLE public.credit_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action_type text NOT NULL CHECK (action_type IN ('resume_tailor','hm_unlock','voice_interview','salary_audit','credit_purchase','refund')),
  credits_delta integer NOT NULL,
  refund_of uuid UNIQUE REFERENCES public.credit_ledger(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX credit_ledger_user_idx ON public.credit_ledger(user_id, created_at DESC);
GRANT SELECT ON public.credit_ledger TO authenticated;
GRANT ALL ON public.credit_ledger TO service_role;
ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own ledger" ON public.credit_ledger FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.api_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  feature_name text NOT NULL,
  provider text NOT NULL,
  estimated_cost_usd numeric(12,6) NOT NULL DEFAULT 0,
  status text NOT NULL CHECK (status IN ('success','failed','cached')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX api_usage_logs_created_idx ON public.api_usage_logs(created_at DESC);
GRANT ALL ON public.api_usage_logs TO service_role;
ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read usage logs" ON public.api_usage_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
GRANT SELECT ON public.api_usage_logs TO authenticated;

CREATE TABLE public.jobs_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_job_id text NOT NULL UNIQUE,
  title text NOT NULL,
  company_name text NOT NULL,
  city_hub text NOT NULL CHECK (city_hub IN ('Bengaluru','Hyderabad','Pune','Mumbai','Delhi NCR','Remote')),
  work_mode text,
  apply_url text,
  raw_description text,
  truth_card_json jsonb NOT NULL DEFAULT '{"true_tech_stack":[],"estimated_ctc_range":null,"is_ghost_job":false,"red_flags":[]}'::jsonb,
  fetched_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX jobs_catalog_city_idx ON public.jobs_catalog(city_hub, fetched_at DESC);
GRANT SELECT ON public.jobs_catalog TO authenticated;
GRANT ALL ON public.jobs_catalog TO service_role;
ALTER TABLE public.jobs_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users read jobs" ON public.jobs_catalog FOR SELECT TO authenticated USING (true);

-- Daily safety switch
CREATE OR REPLACE FUNCTION public.ai_spend_last_24h() RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(SUM(estimated_cost_usd),0) FROM public.api_usage_logs WHERE created_at > now() - interval '24 hours'
$$;
CREATE OR REPLACE FUNCTION public.ai_actions_paused() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.ai_spend_last_24h() >= 10
$$;

CREATE OR REPLACE FUNCTION public.credit_cost(_action text, _units int DEFAULT 1) RETURNS int
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE _action
    WHEN 'resume_tailor' THEN 1
    WHEN 'hm_unlock' THEN 3
    WHEN 'voice_interview' THEN 2 * GREATEST(_units,1)
    WHEN 'salary_audit' THEN 2
  END
$$;

-- Deduct credits for a paid action (server-only). Returns the ledger row id.
CREATE OR REPLACE FUNCTION public.spend_credits(_user_id uuid, _action text, _units int DEFAULT 1) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _cost int := public.credit_cost(_action, _units); _bal int; _id uuid;
BEGIN
  IF _cost IS NULL THEN RAISE EXCEPTION 'invalid action: %', _action USING ERRCODE='22023'; END IF;
  IF public.ai_actions_paused() THEN RAISE EXCEPTION 'AI_MAINTENANCE' USING ERRCODE='P0002'; END IF;
  SELECT credits_balance INTO _bal FROM public.profiles WHERE user_id = _user_id FOR UPDATE;
  IF _bal IS NULL OR _bal < _cost THEN RAISE EXCEPTION 'INSUFFICIENT_CREDITS' USING ERRCODE='P0003'; END IF;
  UPDATE public.profiles SET credits_balance = credits_balance - _cost WHERE user_id = _user_id;
  INSERT INTO public.credit_ledger(user_id, action_type, credits_delta) VALUES (_user_id, _action, -_cost) RETURNING id INTO _id;
  RETURN _id;
END $$;

-- Return credits for a failed action, once per deduction (server-only).
CREATE OR REPLACE FUNCTION public.refund_credits(_ledger_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _row public.credit_ledger;
BEGIN
  SELECT * INTO _row FROM public.credit_ledger WHERE id = _ledger_id FOR UPDATE;
  IF NOT FOUND OR _row.credits_delta >= 0 OR _row.action_type IN ('refund','credit_purchase') THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.credit_ledger WHERE refund_of = _ledger_id) THEN RETURN; END IF;
  INSERT INTO public.credit_ledger(user_id, action_type, credits_delta, refund_of) VALUES (_row.user_id, 'refund', -_row.credits_delta, _ledger_id);
  UPDATE public.profiles SET credits_balance = credits_balance - _row.credits_delta WHERE user_id = _row.user_id;
END $$;

REVOKE ALL ON FUNCTION public.spend_credits(uuid,text,int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refund_credits(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ai_spend_last_24h() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.spend_credits(uuid,text,int) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_credits(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.ai_spend_last_24h() TO service_role;
GRANT EXECUTE ON FUNCTION public.ai_actions_paused() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, full_name, avatar_url, plan, plan_tier, credits_balance)
  VALUES (NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url', 'free', 'scout_free', 5);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  INSERT INTO public.usage_counters (user_id) VALUES (NEW.id) ON CONFLICT (user_id, period_start) DO NOTHING;
  RETURN NEW;
END $$;