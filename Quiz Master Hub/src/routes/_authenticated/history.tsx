import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Timer, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({
    meta: [
      { title: "Attempt history — Quizzly" },
      {
        name: "description",
        content: "Review every quiz you have taken on Quizzly with scores, percentages and dates.",
      },
      { property: "og:title", content: "Attempt history — Quizzly" },
      {
        property: "og:description",
        content: "Your full quiz attempt history with scores and dates.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HistoryPage,
});

type AttemptRow = {
  id: string;
  score: number;
  total: number;
  created_at: string;
  quiz_id: string;
  quizzes: { id: string; title: string; category: string } | null;
};

async function fetchAttempts(): Promise<AttemptRow[]> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return [];

  const { data, error } = await supabase
    .from("attempts")
    .select("id, score, total, created_at, quiz_id, quizzes(id, title, category)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as AttemptRow[];
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

function HistoryPage() {
  const { data, isPending, error } = useQuery({
    queryKey: ["attempt-history"],
    queryFn: fetchAttempts,
  });

  if (isPending) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return <p className="py-24 text-center text-destructive">Couldn't load your attempt history.</p>;
  }

  const attempts = data ?? [];
  const totalAttempts = attempts.length;
  const questionsAnswered = attempts.reduce((sum, a) => sum + a.total, 0);
  const correctAnswers = attempts.reduce((sum, a) => sum + a.score, 0);
  const average = questionsAnswered ? Math.round((correctAnswers / questionsAnswered) * 100) : 0;
  const best = attempts.reduce(
    (top, a) => Math.max(top, a.total ? Math.round((a.score / a.total) * 100) : 0),
    0,
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="text-4xl font-bold sm:text-5xl">Attempt history</h1>
      <p className="mt-3 text-muted-foreground">
        Every quiz you've taken, newest first — with the score you earned.
      </p>

      {totalAttempts === 0 ? (
        <div className="card-pop mt-8 p-10 text-center">
          <p className="text-sm text-muted-foreground">You haven't taken any quizzes yet.</p>
          <Button asChild variant="pop" className="mt-5">
            <Link to="/quizzes">Browse quizzes</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="card-pop p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Attempts
              </p>
              <p className="mt-1 text-3xl font-bold">{totalAttempts}</p>
            </div>
            <div className="card-pop p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Average score
              </p>
              <p className="mt-1 text-3xl font-bold">{average}%</p>
            </div>
            <div className="card-pop p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Best score
              </p>
              <p className="mt-1 flex items-center gap-2 text-3xl font-bold">
                <Trophy className="size-6" /> {best}%
              </p>
            </div>
          </div>

          <ul className="mt-8 space-y-3">
            {attempts.map((attempt) => {
              const pct = attempt.total ? Math.round((attempt.score / attempt.total) * 100) : 0;
              return (
                <li key={attempt.id} className="card-pop p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      {attempt.quizzes?.category ? (
                        <span className="w-fit rounded-full border-2 border-ink bg-accent px-3 py-0.5 text-xs font-bold">
                          {attempt.quizzes.category}
                        </span>
                      ) : null}
                      <h2 className="mt-2 text-lg font-bold">
                        {attempt.quizzes?.title ?? "Deleted quiz"}
                      </h2>
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Timer className="size-4" />
                        {dateFormatter.format(new Date(attempt.created_at))}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="rounded-full border-2 border-ink bg-secondary px-3 py-1 text-sm font-bold text-secondary-foreground">
                        {attempt.score}/{attempt.total} · {pct}%
                      </span>
                      {attempt.quizzes ? (
                        <Button asChild variant="popOutline" size="sm">
                          <Link to="/quiz/$quizId" params={{ quizId: attempt.quizzes.id }}>
                            Retake
                          </Link>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
