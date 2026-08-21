ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS explanation text NOT NULL DEFAULT '';
GRANT INSERT (explanation), UPDATE (explanation) ON public.questions TO authenticated;