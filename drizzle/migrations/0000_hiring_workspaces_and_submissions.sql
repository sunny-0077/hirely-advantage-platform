CREATE TABLE public.hiring_accounts (
 user_id uuid PRIMARY KEY, account_type text NOT NULL CHECK (account_type IN ('candidate','employer')), company_name text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now(), CHECK (account_type <> 'employer' OR length(trim(company_name)) > 0)
);
GRANT SELECT, INSERT ON public.hiring_accounts TO authenticated;
GRANT ALL ON public.hiring_accounts TO service_role;
ALTER TABLE public.hiring_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY account_read ON public.hiring_accounts FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY account_create ON public.hiring_accounts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE TABLE public.job_listings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), employer_id uuid NOT NULL, title text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 200), company_name text NOT NULL, location text NOT NULL DEFAULT '', employment_type text NOT NULL DEFAULT 'Full-time', description text NOT NULL CHECK (length(trim(description)) BETWEEN 20 AND 20000), keywords text[] NOT NULL DEFAULT '{}', status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')), created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.job_listings TO authenticated;
GRANT ALL ON public.job_listings TO service_role;
ALTER TABLE public.job_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY job_read ON public.job_listings FOR SELECT TO authenticated USING (status = 'open' OR employer_id = auth.uid());
CREATE POLICY job_create ON public.job_listings FOR INSERT TO authenticated WITH CHECK (employer_id = auth.uid() AND EXISTS (SELECT 1 FROM public.hiring_accounts WHERE user_id = auth.uid() AND account_type = 'employer'));
CREATE POLICY job_update ON public.job_listings FOR UPDATE TO authenticated USING (employer_id = auth.uid()) WITH CHECK (employer_id = auth.uid());
CREATE INDEX job_employer_idx ON public.job_listings(employer_id);
CREATE TABLE public.job_submissions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), job_id uuid NOT NULL REFERENCES public.job_listings(id), employer_id uuid NOT NULL, candidate_id uuid NOT NULL, candidate_name text NOT NULL, candidate_email text NOT NULL, resume_name text NOT NULL, resume_text text NOT NULL, cover_letter_text text NOT NULL DEFAULT '', matched_keywords text[] NOT NULL DEFAULT '{}', missing_keywords text[] NOT NULL DEFAULT '{}', match_score integer, status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','shortlisted','interview','rejected')), created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(job_id,candidate_id)
);
GRANT SELECT ON public.job_submissions TO authenticated;
GRANT UPDATE(status) ON public.job_submissions TO authenticated;
GRANT ALL ON public.job_submissions TO service_role;
ALTER TABLE public.job_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY submission_read ON public.job_submissions FOR SELECT TO authenticated USING (candidate_id = auth.uid() OR employer_id = auth.uid());
CREATE POLICY submission_review ON public.job_submissions FOR UPDATE TO authenticated USING (employer_id = auth.uid()) WITH CHECK (employer_id = auth.uid());
CREATE INDEX submission_employer_idx ON public.job_submissions(employer_id);
CREATE INDEX submission_candidate_idx ON public.job_submissions(candidate_id);
CREATE OR REPLACE FUNCTION public.submit_job_application(p_job_id uuid, p_resume_id uuid, p_cover_letter_id uuid DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE j public.job_listings; r public.resumes; c public.cover_letters; matched text[]; missing text[]; submission_id uuid; applicant_name text; applicant_email text;
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
 SELECT coalesce(display_name,'Candidate') INTO applicant_name FROM public.profiles WHERE user_id = auth.uid();
 applicant_email := coalesce(auth.jwt()->>'email','');
 SELECT coalesce(array_agg(k) FILTER (WHERE strpos(lower(r.raw_text || ' ' || coalesce(c.full_letter,'')),lower(k)) > 0),'{}'), coalesce(array_agg(k) FILTER (WHERE strpos(lower(r.raw_text || ' ' || coalesce(c.full_letter,'')),lower(k)) = 0),'{}') INTO matched, missing FROM unnest(j.keywords) k;
 INSERT INTO public.job_submissions(job_id, employer_id,candidate_id,candidate_name,candidate_email,resume_name,resume_text,cover_letter_text,matched_keywords,missing_keywords,match_score)
 VALUES(j.id,j.employer_id,auth.uid(),coalesce(applicant_name,'Candidate'),applicant_email,r.file_name,r.raw_text,coalesce(c.full_letter,''),matched,missing,CASE WHEN cardinality(j.keywords)>0 THEN round(100.0*cardinality(matched)/cardinality(j.keywords)) ELSE NULL END) RETURNING id INTO submission_id;
 RETURN submission_id;
END; $$;
REVOKE ALL ON FUNCTION public.submit_job_application(uuid,uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_job_application(uuid,uuid,uuid) TO authenticated;