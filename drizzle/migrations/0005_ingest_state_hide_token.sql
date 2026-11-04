REVOKE SELECT ON public.ingest_job_state FROM authenticated;
GRANT SELECT (id, locked_until, paused_reason, last_run_at, last_result) ON public.ingest_job_state TO authenticated;