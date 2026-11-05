CREATE TABLE public.document_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  document_id uuid NOT NULL,
  document_type text NOT NULL CHECK (document_type IN ('tailored_resume','cover_letter','interview_prep')),
  helpful boolean NOT NULL,
  comment text CHECK (comment IS NULL OR char_length(comment) <= 300),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, document_id, document_type)
);
GRANT SELECT, INSERT, UPDATE ON public.document_feedback TO authenticated;
GRANT ALL ON public.document_feedback TO service_role;
ALTER TABLE public.document_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own insert doc feedback" ON public.document_feedback FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update doc feedback" ON public.document_feedback FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own or admin read doc feedback" ON public.document_feedback FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.platform_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category text NOT NULL CHECK (category IN ('bug','ai_quality','feature_request','ux_design')),
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  message text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 2000),
  page_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.platform_feedback TO authenticated;
GRANT ALL ON public.platform_feedback TO service_role;
ALTER TABLE public.platform_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own insert platform feedback" ON public.platform_feedback FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own or admin read platform feedback" ON public.platform_feedback FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));