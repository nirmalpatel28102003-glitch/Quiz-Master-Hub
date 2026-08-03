CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT 'Quizzer',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'display_name', ''), split_part(NEW.email, '@', 1), 'Quizzer')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'General',
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.quizzes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quizzes TO authenticated;
GRANT ALL ON public.quizzes TO service_role;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published quizzes are public" ON public.quizzes FOR SELECT USING (published = true);
CREATE POLICY "Creators can view own quizzes" ON public.quizzes FOR SELECT TO authenticated USING (auth.uid() = creator_id);
CREATE POLICY "Creators can insert quizzes" ON public.quizzes FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creators can update own quizzes" ON public.quizzes FOR UPDATE TO authenticated USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creators can delete own quizzes" ON public.quizzes FOR DELETE TO authenticated USING (auth.uid() = creator_id);

CREATE TABLE public.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  prompt text NOT NULL,
  options jsonb NOT NULL,
  correct_index integer NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX questions_quiz_id_idx ON public.questions(quiz_id);
-- Column-level grants: correct_index is never readable by the browser.
GRANT SELECT (id, quiz_id, prompt, options, position, created_at) ON public.questions TO anon;
GRANT SELECT (id, quiz_id, prompt, options, position, created_at) ON public.questions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.questions TO authenticated;
GRANT ALL ON public.questions TO service_role;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Questions of published quizzes are public" ON public.questions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.quizzes q WHERE q.id = quiz_id AND q.published = true)
);
CREATE POLICY "Creators can view own questions" ON public.questions FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.quizzes q WHERE q.id = quiz_id AND q.creator_id = auth.uid())
);
CREATE POLICY "Creators can insert questions" ON public.questions FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.quizzes q WHERE q.id = quiz_id AND q.creator_id = auth.uid())
);
CREATE POLICY "Creators can update own questions" ON public.questions FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.quizzes q WHERE q.id = quiz_id AND q.creator_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.quizzes q WHERE q.id = quiz_id AND q.creator_id = auth.uid())
);
CREATE POLICY "Creators can delete own questions" ON public.questions FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.quizzes q WHERE q.id = quiz_id AND q.creator_id = auth.uid())
);

CREATE TABLE public.attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score integer NOT NULL,
  total integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX attempts_user_id_idx ON public.attempts(user_id);
GRANT SELECT, INSERT ON public.attempts TO authenticated;
GRANT ALL ON public.attempts TO service_role;
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own attempts" ON public.attempts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own attempts" ON public.attempts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);