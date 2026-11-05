ALTER TABLE public.profiles ADD COLUMN getting_started_dismissed_at timestamptz;

CREATE OR REPLACE FUNCTION public.admin_platform_feedback()
RETURNS TABLE (id uuid, user_id uuid, email text, category text, rating integer, message text, page_path text, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  RETURN QUERY SELECT f.id, f.user_id, u.email::text, f.category, f.rating, f.message, f.page_path, f.created_at
    FROM public.platform_feedback f LEFT JOIN auth.users u ON u.id = f.user_id ORDER BY f.created_at DESC LIMIT 1000;
END $$;

CREATE OR REPLACE FUNCTION public.admin_document_feedback()
RETURNS TABLE (id uuid, user_id uuid, email text, document_id uuid, document_type text, helpful boolean, comment text, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  RETURN QUERY SELECT f.id, f.user_id, u.email::text, f.document_id, f.document_type, f.helpful, f.comment, f.created_at
    FROM public.document_feedback f LEFT JOIN auth.users u ON u.id = f.user_id ORDER BY f.created_at DESC LIMIT 1000;
END $$;

REVOKE ALL ON FUNCTION public.admin_platform_feedback() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_document_feedback() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_platform_feedback() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_document_feedback() TO authenticated;