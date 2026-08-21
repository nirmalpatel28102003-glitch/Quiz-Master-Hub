-- Answer key (correct_index) and explanation stay unreadable by clients.
REVOKE ALL ON public.questions FROM anon, authenticated;

-- Readable, non-answer columns only.
GRANT SELECT (id, quiz_id, prompt, options, position, created_at) ON public.questions TO anon, authenticated;

-- Creators still manage their questions (RLS restricts to quiz owners).
GRANT INSERT (id, quiz_id, prompt, options, position, correct_index, explanation) ON public.questions TO authenticated;
GRANT UPDATE (prompt, options, position, correct_index, explanation) ON public.questions TO authenticated;
GRANT DELETE ON public.questions TO authenticated;

GRANT ALL ON public.questions TO service_role;