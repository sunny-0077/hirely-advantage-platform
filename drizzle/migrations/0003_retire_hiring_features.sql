COMMENT ON TABLE public.job_submissions IS 'DEPRECATED: hiring side removed (Phase 1A)';
COMMENT ON TABLE public.job_listings IS 'DEPRECATED: hiring side removed (Phase 1A)';
COMMENT ON TABLE public.hiring_accounts IS 'DEPRECATED: hiring side removed (Phase 1A)';
REVOKE EXECUTE ON FUNCTION public.submit_job_application(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;