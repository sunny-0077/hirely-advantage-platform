CREATE TABLE public.ingest_job_state (
  id text PRIMARY KEY DEFAULT 'ingest-jobs',
  cron_token text NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  locked_until timestamptz,
  paused_reason text,
  last_run_at timestamptz,
  last_result jsonb NOT NULL DEFAULT '{}'::jsonb
);
GRANT SELECT ON public.ingest_job_state TO authenticated;
GRANT ALL ON public.ingest_job_state TO service_role;
ALTER TABLE public.ingest_job_state ENABLE ROW LEVEL SECURITY;
REVOKE SELECT (cron_token) ON public.ingest_job_state FROM authenticated;
CREATE POLICY "Admins read ingest state" ON public.ingest_job_state FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.ingest_job_state (id) VALUES ('ingest-jobs');