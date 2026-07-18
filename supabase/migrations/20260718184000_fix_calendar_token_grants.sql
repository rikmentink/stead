-- PostgREST needs table-level DML; hide refresh_token from client SELECT only.
-- (Pure column GRANT INSERT without table SELECT broke upserts with 403.)

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.google_calendar_tokens TO authenticated;
REVOKE SELECT (refresh_token) ON TABLE public.google_calendar_tokens FROM authenticated;
REVOKE ALL ON TABLE public.google_calendar_tokens FROM anon;
