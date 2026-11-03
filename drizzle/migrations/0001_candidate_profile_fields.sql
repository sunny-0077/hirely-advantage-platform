ALTER TABLE public.profiles
 ADD COLUMN IF NOT EXISTS headline text,
 ADD COLUMN IF NOT EXISTS skills text[] NOT NULL DEFAULT '{}',
 ADD COLUMN IF NOT EXISTS education jsonb NOT NULL DEFAULT '[]'::jsonb,
 ADD COLUMN IF NOT EXISTS experience jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE OR REPLACE FUNCTION public.submit_job_application(p_job_id uuid, p_resume_id uuid, p_cover_letter_id uuid DEFAULT NULL::uuid)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE j public.job_listings; r public.resumes; c public.cover_letters; p public.profiles; matched text[]; missing text[]; submission_id uuid; applicant_email text; corpus text;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to apply'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.hiring_accounts WHERE user_id = auth.uid() AND account_type = 'candidate') THEN RAISE EXCEPTION 'Candidate account required'; END IF;
 SELECT * INTO j FROM public.job_listings WHERE id = p_job_id AND status = 'open' FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'This job is no longer open'; END IF;
 IF j.employer_id = auth.uid() THEN RAISE EXCEPTION 'Cannot apply to your own listing'; END IF;
 SELECT * INTO r FROM public.resumes WHERE id = p_resume_id AND user_id = auth.uid();
 IF NOT FOUND OR coalesce(length(trim(r.raw_text)),0) = 0 THEN RAISE EXCEPTION 'Choose your own resume with extracted text'; END IF;
 IF p_cover_letter_id IS NOT NULL THEN
  SELECT * INTO c FROM public.cover_letters WHERE id = p_cover_letter_id AND user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Choose your own cover letter'; END IF;
 END IF;
 SELECT * INTO p FROM public.profiles WHERE user_id = auth.uid();
 applicant_email := coalesce(auth.jwt()->>'email','');
 corpus := lower(r.raw_text || ' ' || coalesce(c.full_letter,'') || ' ' || coalesce(p.headline,'') || ' ' || array_to_string(coalesce(p.skills,'{}'),' ') || ' ' || coalesce(p.experience::text,'') || ' ' || coalesce(p.education::text,''));
 SELECT coalesce(array_agg(k) FILTER (WHERE strpos(corpus,lower(k)) > 0),'{}'), coalesce(array_agg(k) FILTER (WHERE strpos(corpus,lower(k)) = 0),'{}') INTO matched, missing FROM unnest(j.keywords) k;
 INSERT INTO public.job_submissions(job_id, employer_id,candidate_id,candidate_name,candidate_email,resume_name,resume_text,cover_letter_text,matched_keywords,missing_keywords,match_score)
 VALUES(j.id,j.employer_id,auth.uid(),coalesce(p.display_name,'Candidate'),applicant_email,r.file_name,r.raw_text,coalesce(c.full_letter,''),matched,missing,CASE WHEN cardinality(j.keywords)>0 THEN round(100.0*cardinality(matched)/cardinality(j.keywords)) ELSE NULL END) RETURNING id INTO submission_id;
 RETURN submission_id;
END; $function$;