-- Harden calendar tokens: authenticated clients can write refresh_token
-- but cannot SELECT it back (reduces XSS blast radius). Edge Function uses
-- service role to read refresh_token for Google token refresh.

REVOKE ALL ON TABLE public.google_calendar_tokens FROM PUBLIC;
REVOKE ALL ON TABLE public.google_calendar_tokens FROM anon;
REVOKE ALL ON TABLE public.google_calendar_tokens FROM authenticated;

GRANT INSERT, DELETE ON TABLE public.google_calendar_tokens TO authenticated;
GRANT SELECT (user_id, access_token, expiry, updated_at)
  ON TABLE public.google_calendar_tokens TO authenticated;
GRANT INSERT (user_id, access_token, refresh_token, expiry, updated_at)
  ON TABLE public.google_calendar_tokens TO authenticated;
GRANT UPDATE (access_token, refresh_token, expiry, updated_at)
  ON TABLE public.google_calendar_tokens TO authenticated;
