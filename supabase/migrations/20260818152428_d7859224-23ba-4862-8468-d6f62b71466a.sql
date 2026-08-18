GRANT SELECT (id, quiz_id, prompt, options, position, created_at) ON public.questions TO anon;
GRANT SELECT (id, quiz_id, prompt, options, position, created_at) ON public.questions TO authenticated;