ALTER TABLE public.profiles DROP CONSTRAINT onboarding_step_valid;
ALTER TABLE public.profiles ADD CONSTRAINT onboarding_step_valid CHECK (onboarding_step >= 1 AND onboarding_step <= 5);