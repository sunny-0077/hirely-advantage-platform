
-- Atomic monthly usage increment. Upserts the counter row and bumps the given
-- column in a single statement. Returns the new value.
CREATE OR REPLACE FUNCTION public.increment_usage_counter(
  _user_id uuid,
  _column text,
  _delta int DEFAULT 1
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _period date := date_trunc('month', now())::date;
  _allowed text[] := ARRAY[
    'resume_uploads','analyses','cover_letters',
    'interview_questions','mock_interviews'
  ];
  _new_value int;
BEGIN
  IF NOT (_column = ANY(_allowed)) THEN
    RAISE EXCEPTION 'invalid usage column: %', _column USING ERRCODE = '22023';
  END IF;

  -- Ensure the row exists for this period.
  INSERT INTO public.usage_counters (user_id, period_start)
  VALUES (_user_id, _period)
  ON CONFLICT (user_id, period_start) DO NOTHING;

  -- Atomic bump.
  EXECUTE format(
    'UPDATE public.usage_counters SET %I = COALESCE(%I,0) + $1 WHERE user_id = $2 AND period_start = $3 RETURNING %I',
    _column, _column, _column
  )
  INTO _new_value
  USING _delta, _user_id, _period;

  RETURN _new_value;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_usage_counter(uuid, text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_usage_counter(uuid, text, int) TO service_role;

-- Server-side enforcement + atomic count for resume uploads. Client
-- upload code cannot bypass this because it runs in a trigger on the row.
CREATE OR REPLACE FUNCTION public.enforce_resume_upload_quota()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _plan text;
  _limit int;
  _period date := date_trunc('month', now())::date;
  _used int;
BEGIN
  SELECT plan INTO _plan FROM public.profiles WHERE user_id = NEW.user_id;
  _plan := COALESCE(_plan, 'free');

  _limit := CASE _plan
    WHEN 'free'     THEN 1
    WHEN 'pro'      THEN 10
    WHEN 'advanced' THEN 50
    WHEN 'teams'    THEN NULL   -- unlimited
    ELSE 1
  END;

  IF _limit IS NOT NULL THEN
    INSERT INTO public.usage_counters (user_id, period_start)
    VALUES (NEW.user_id, _period)
    ON CONFLICT (user_id, period_start) DO NOTHING;

    SELECT COALESCE(resume_uploads, 0) INTO _used
    FROM public.usage_counters
    WHERE user_id = NEW.user_id AND period_start = _period
    FOR UPDATE;

    IF _used >= _limit THEN
      RAISE EXCEPTION 'Monthly resume upload limit reached for your % plan (%).', _plan, _limit
        USING ERRCODE = 'P0001';
    END IF;

    UPDATE public.usage_counters
      SET resume_uploads = COALESCE(resume_uploads, 0) + 1
      WHERE user_id = NEW.user_id AND period_start = _period;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_resume_upload_quota ON public.resumes;
CREATE TRIGGER trg_enforce_resume_upload_quota
  BEFORE INSERT ON public.resumes
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_resume_upload_quota();
