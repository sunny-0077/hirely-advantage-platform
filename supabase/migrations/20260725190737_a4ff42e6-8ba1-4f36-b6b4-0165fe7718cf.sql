
REVOKE EXECUTE ON FUNCTION public.increment_usage_counter(uuid, text, int) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_resume_upload_quota() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_usage_counter(uuid, text, int) TO service_role;
GRANT EXECUTE ON FUNCTION public.enforce_resume_upload_quota() TO service_role;
