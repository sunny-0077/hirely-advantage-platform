CREATE OR REPLACE FUNCTION public.validate_master_resume_json()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.master_resume_json IS NULL THEN NEW.master_resume_json := '{}'::jsonb; END IF;
  IF jsonb_typeof(NEW.master_resume_json) <> 'object' THEN RAISE EXCEPTION 'Master resume must be an object'; END IF;
  IF pg_column_size(NEW.master_resume_json) > 200000 THEN RAISE EXCEPTION 'Master resume is too large'; END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_validate_master_resume_json ON public.profiles;
CREATE TRIGGER trg_validate_master_resume_json BEFORE INSERT OR UPDATE OF master_resume_json ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.validate_master_resume_json();