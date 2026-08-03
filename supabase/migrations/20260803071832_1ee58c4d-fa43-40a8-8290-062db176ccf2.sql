ALTER TABLE public.quizzes
  ADD CONSTRAINT quizzes_creator_profile_fkey
  FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;