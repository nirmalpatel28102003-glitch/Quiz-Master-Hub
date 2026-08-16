REVOKE SELECT ON public.questions FROM anon, authenticated;

GRANT SELECT (id, quiz_id, prompt, options, position, created_at) ON public.questions TO anon, authenticated;

GRANT SELECT ON public.questions TO service_role;