ALTER TABLE public.profiles
 ADD COLUMN email text,
 ADD COLUMN country text,
 ADD COLUMN preferred_currency text,
 ADD COLUMN preferred_location text,
 ADD COLUMN target_job_role text,
 ADD COLUMN experience_level text,
 ADD COLUMN preferred_job_location text,
 ADD COLUMN employment_preference text,
 ADD COLUMN onboarding_step integer NOT NULL DEFAULT 1,
 ADD COLUMN onboarding_completed boolean NOT NULL DEFAULT false;
UPDATE public.profiles p SET email = u.email FROM auth.users u WHERE p.user_id = u.id;
ALTER TABLE public.profiles ADD CONSTRAINT onboarding_step_valid CHECK (onboarding_step BETWEEN 1 AND 3), ADD CONSTRAINT onboarding_experience_valid CHECK (experience_level IS NULL OR experience_level IN ('student','entry','mid','senior')), ADD CONSTRAINT onboarding_employment_valid CHECK (employment_preference IS NULL OR employment_preference IN ('Full-time','Internship','Contract','Remote'));
CREATE OR REPLACE FUNCTION public.prepare_profile_identity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 NEW.id := NEW.user_id;
 SELECT email INTO NEW.email FROM auth.users WHERE id = NEW.user_id;
 RETURN NEW;
END;
$$;
CREATE TRIGGER prepare_profile_identity BEFORE INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.prepare_profile_identity();
CREATE OR REPLACE FUNCTION public.validate_profile_onboarding() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF length(coalesce(NEW.full_name,'')) > 100 OR length(coalesce(NEW.country,'')) > 100 OR length(coalesce(NEW.preferred_location,'')) > 200 OR length(coalesce(NEW.target_job_role,'')) > 200 OR length(coalesce(NEW.preferred_job_location,'')) > 200 OR length(coalesce(NEW.master_resume_text,'')) > 50000 THEN RAISE EXCEPTION 'Profile information exceeds the allowed length'; END IF;
 IF NEW.preferred_currency IS NOT NULL AND NEW.preferred_currency !~ '^[A-Z]{3}$' THEN RAISE EXCEPTION 'Invalid currency'; END IF;
 IF NEW.onboarding_completed AND (length(btrim(coalesce(NEW.full_name,''))) = 0 OR length(btrim(coalesce(NEW.country,''))) = 0 OR length(btrim(coalesce(NEW.preferred_location,''))) = 0 OR length(btrim(coalesce(NEW.target_job_role,''))) = 0 OR length(btrim(coalesce(NEW.preferred_job_location,''))) = 0 OR NEW.preferred_currency IS NULL OR NEW.experience_level IS NULL OR NEW.employment_preference IS NULL) THEN RAISE EXCEPTION 'Complete personal information and career preferences first'; END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER validate_profile_onboarding BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.validate_profile_onboarding();
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.profiles FROM anon;
REVOKE INSERT, DELETE ON public.profiles FROM authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (country, preferred_currency, preferred_location, target_job_role, experience_level, preferred_job_location, employment_preference, onboarding_step, onboarding_completed) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
REVOKE ALL ON public.user_roles FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM authenticated;
CREATE VIEW public.user_profiles WITH (security_invoker = true) AS SELECT user_id AS id, full_name, email, country, preferred_currency, preferred_location, target_job_role, experience_level, preferred_job_location, employment_preference, onboarding_step, onboarding_completed, created_at, updated_at FROM public.profiles;
GRANT SELECT ON public.user_profiles TO authenticated;
GRANT ALL ON public.user_profiles TO service_role;
COMMENT ON VIEW public.user_profiles IS 'User-facing identity projection of existing profiles; caller RLS applies, id is the authenticated user UUID. No duplicate profile storage.';