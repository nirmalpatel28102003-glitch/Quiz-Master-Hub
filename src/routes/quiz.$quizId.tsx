import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { gradeQuiz, saveAttempt, type GradeResult } from "@/lib/quiz.functions";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/quiz/$quizId")({
  head: () => ({
    meta: [
      { title: "Take the quiz — Quizzly" },
      {
        name: "description",
        content: "Answer one question at a time and get your score instantly when you finish.",
      },
      { property: "og:title", content: "Take the quiz — Quizzly" },
      {
        property: "og:description",
        content: "One question at a time, instant scoring, and every correct answer revealed.",
      },
    ],
  }),
  component: TakeQuizPage,
});

type QuestionRow = { id: string; prompt: string; options: string[]; position: number };

async function fetchQuiz(quizId: string) {
  const [quiz, questions] = await Promise.all([
    supabase
      .from("quizzes")
      .select("id, title, description, category, profiles(display_name)")
      .eq("id", quizId)
      .maybeSingle(),
    supabase
      .from("questions")
      .select("id, prompt, options, position")
      .eq("quiz_id", quizId)
      .order("position", { ascending: true }),
  ]);

  if (quiz.error) throw new Error(quiz.error.message);
  if (questions.error) throw new Error(questions.error.message);
  if (!quiz.data) throw new Error("Quiz not found");

  return {
    quiz: quiz.data as unknown as {
      id: string;
      title: string;
      description: string;
      category: string;
      profiles: { display_name: string } | null;
    },
    questions: (questions.data ?? []) as unknown as QuestionRow[],
  };
}

function TakeQuizPage() {
  const { quizId } = Route.useParams();
  const { user } = useAuth();
  const grade = useServerFn(gradeQuiz);
  const persist = useServerFn(saveAttempt);

  const { data, isPending, error } = useQuery({
    queryKey: ["quiz", quizId],
    queryFn: () => fetchQuiz(quizId),
  });

  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<GradeResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const questions = data?.questions ?? [];
  const question = questions[current];
  const progress = questions.length ? ((current + (result ? 1 : 0)) / questions.length) * 100 : 0;

  const correctById = useMemo(() => {
    const map: Record<string, number> = {};
    result?.questions.forEach((q) => (map[q.questionId] = q.correctIndex));
    return map;
  }, [result]);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const graded = await grade({ data: { quizId, answers } });
      setResult(graded);
      if (user) {
        await persist({ data: { quizId, score: graded.score, total: graded.total } }).catch(() => {});
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not score the quiz.");
    } finally {
      setSubmitting(false);
    }
  }

  function restart() {
    setResult(null);
    setAnswers({});
    setCurrent(0);
  }

  if (isPending) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">Quiz not found</h1>
        <Button asChild variant="pop" className="mt-6">
          <Link to="/quizzes">Browse quizzes</Link>
        </Button>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">{data.quiz.title}</h1>
        <p className="mt-2 text-muted-foreground">This quiz has no questions yet.</p>
      </div>
    );
  }

  if (result) {
    const percent = Math.round((result.score / result.total) * 100);
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <div className="card-pop p-8 text-center">
          <p className="text-sm font-bold tracking-wide text-muted-foreground uppercase">
            Your score
          </p>
          <p className="mt-3 font-display text-6xl font-bold text-gradient-sunset">
            {result.score}/{result.total}
          </p>
          <p className="mt-2 text-muted-foreground">
            {percent}% ·{" "}
            {percent === 100
              ? "Flawless."
              : percent >= 70
                ? "Strong showing."
                : percent >= 40
                  ? "Room to grow."
                  : "Ouch. Try again?"}
          </p>
          {!user ? (
            <p className="mt-4 text-sm text-muted-foreground">
              <Link to="/auth" className="font-semibold underline underline-offset-4">
                Sign in
              </Link>{" "}
              to save your scores.
            </p>
          ) : null}
        </div>

        <h2 className="mt-10 text-xl font-bold">Answer review</h2>
        <ul className="mt-4 space-y-4">
          {questions.map((q, index) => {
            const chosen = answers[q.id] ?? -1;
            const correct = correctById[q.id] ?? -1;
            const isCorrect = chosen === correct;
            return (
              <li key={q.id} className="card-pop p-5">
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-ink ${
                      isCorrect ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"
                    }`}
                  >
                    {isCorrect ? <Check className="size-3.5" /> : <X className="size-3.5" />}
                  </span>
                  <div>
                    <p className="font-semibold">
                      {index + 1}. {q.prompt}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Correct answer: <span className="font-semibold text-foreground">{q.options[correct]}</span>
                    </p>
                    {!isCorrect ? (
                      <p className="text-sm text-muted-foreground">
                        You answered: {chosen >= 0 ? q.options[chosen] : "nothing"}
                      </p>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button variant="popOutline" size="lg" onClick={restart}>
            Try again
          </Button>
          <Button asChild variant="pop" size="lg" className="sm:ml-auto">
            <Link to="/quizzes">Browse more quizzes</Link>
          </Button>
        </div>
      </div>
    );
  }

  const selected = question ? answers[question.id] : undefined;
  const isLast = current === questions.length - 1;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div className="text-center">
        <span className="w-fit rounded-full border-2 border-ink bg-accent px-3 py-0.5 text-xs font-bold">
          {data.quiz.category}
        </span>
        <h1 className="mt-3 text-3xl font-bold sm:text-4xl">{data.quiz.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          by {data.quiz.profiles?.display_name ?? "Anonymous"}
        </p>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between text-sm font-semibold text-muted-foreground">
          <span>
            Question {current + 1} of {questions.length}
          </span>
          <span>{Object.keys(answers).length} answered</span>
        </div>
        <Progress value={progress} className="mt-2 h-3 border-2 border-ink" />
      </div>

      {question ? (
        <div className="card-pop mt-6 p-6 sm:p-8">
          <h2 className="text-xl font-bold sm:text-2xl">{question.prompt}</h2>
          <div className="mt-6 space-y-3">
            {question.options.map((option, index) => {
              const active = selected === index;
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => setAnswers((prev) => ({ ...prev, [question.id]: index }))}
                  className={`flex w-full items-center gap-3 rounded-2xl border-2 border-ink px-4 py-3 text-left font-medium transition-all ${
                    active
                      ? "bg-secondary text-secondary-foreground shadow-pop-sm"
                      : "bg-card hover:-translate-y-0.5"
                  }`}
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-background text-xs font-bold">
                    {String.fromCharCode(65 + index)}
                  </span>
                  {option}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="mt-6 flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="lg"
          disabled={current === 0}
          onClick={() => setCurrent((c) => Math.max(0, c - 1))}
        >
          Back
        </Button>
        {isLast ? (
          <Button
            variant="pop"
            size="lg"
            disabled={selected === undefined || submitting}
            onClick={handleSubmit}
          >
            {submitting ? <Loader2 className="animate-spin" /> : null}
            Finish & see score
          </Button>
        ) : (
          <Button
            variant="pop"
            size="lg"
            disabled={selected === undefined}
            onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))}
          >
            Next question
          </Button>
        )}
      </div>
    </div>
  );
}
