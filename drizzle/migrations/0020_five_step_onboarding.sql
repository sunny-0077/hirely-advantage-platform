ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS resume_mode text,
  ADD COLUMN IF NOT EXISTS resume_file_url text,
  ADD COLUMN IF NOT EXISTS preferred_template text,
  ADD COLUMN IF NOT EXISTS preferred_locations text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS work_modes text[] NOT NULL DEFAULT '{}';

CREATE OR REPLACE FUNCTION public.validate_profile_onboarding()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
 IF length(coalesce(NEW.full_name,'')) > 100 OR length(coalesce(NEW.country,'')) > 100 OR length(coalesce(NEW.preferred_location,'')) > 200 OR length(coalesce(NEW.target_job_role,'')) > 200 OR length(coalesce(NEW.preferred_job_location,'')) > 200 OR length(coalesce(NEW.master_resume_text,'')) > 50000 OR length(coalesce(NEW.resume_file_url,'')) > 500 THEN RAISE EXCEPTION 'Profile information exceeds the allowed length'; END IF;
 IF NEW.preferred_currency IS NOT NULL AND NEW.preferred_currency !~ '^[A-Z]{3}$' THEN RAISE EXCEPTION 'Invalid currency'; END IF;
 IF NEW.resume_mode IS NOT NULL AND NEW.resume_mode NOT IN ('upload','build') THEN RAISE EXCEPTION 'Invalid resume mode'; END IF;
 IF NEW.preferred_template IS NOT NULL AND NEW.preferred_template NOT IN ('minimal','modern','classic') THEN RAISE EXCEPTION 'Invalid template'; END IF;
 IF coalesce(array_length(NEW.preferred_locations,1),0) > 4 OR EXISTS (SELECT 1 FROM unnest(NEW.preferred_locations) l WHERE length(btrim(l)) = 0 OR length(l) > 120) THEN RAISE EXCEPTION 'Invalid preferred locations'; END IF;
 IF NOT (NEW.work_modes <@ ARRAY['On-site','Hybrid','Remote']::text[]) THEN RAISE EXCEPTION 'Invalid work modes'; END IF;
 IF NEW.onboarding_completed AND NOT coalesce(OLD.onboarding_completed,false) AND (
   NEW.resume_mode IS NULL OR length(btrim(coalesce(NEW.target_job_role,''))) = 0 OR NEW.experience_level IS NULL
   OR coalesce(array_length(NEW.preferred_locations,1),0) = 0 OR coalesce(array_length(NEW.work_modes,1),0) = 0
   OR (NEW.resume_mode = 'upload' AND NEW.resume_file_url IS NULL)
   OR (NEW.resume_mode = 'build' AND NEW.preferred_template IS NULL)) THEN
   RAISE EXCEPTION 'Complete all onboarding steps first'; END IF;
 RETURN NEW;
END;
$function$;