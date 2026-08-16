import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ListChecks, Timer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/quizzes")({
  head: () => ({
    meta: [
      { title: "Browse quizzes — Quizzly" },
      {
        name: "description",
        content: "Browse every published quiz on Quizzly and play one right now, no account needed.",
      },
      { property: "og:title", content: "Browse quizzes — Quizzly" },
      {
        property: "og:description",
        content: "Every published Quizzly quiz in one place. Pick one and start playing.",
      },
    ],
  }),
  component: QuizzesPage,
});

type QuizRow = {
  id: string;
  title: string;
  description: string;
  category: string;
  created_at: string;
  time_limit_seconds: number | null;
  profiles: { display_name: string } | null;
  questions: { count: number }[];
};

async function fetchQuizzes() {
  const { data, error } = await supabase
    .from("quizzes")
    .select("id, title, description, category, created_at, time_limit_seconds, profiles(display_name), questions(count)")
    .eq("published", true)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as QuizRow[];
}

function QuizzesPage() {
  const { data, isPending, error } = useQuery({ queryKey: ["quizzes"], queryFn: fetchQuizzes });

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold sm:text-5xl">Browse quizzes</h1>
          <p className="mt-2 text-muted-foreground">Pick one and see how you do.</p>
        </div>
        <Button asChild variant="popSecondary">
          <Link to="/create">Create your own</Link>
        </Button>
      </div>

      {isPending ? (
        <div className="flex justify-center py-24">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="py-24 text-center text-destructive">Couldn't load quizzes. Try refreshing.</p>
      ) : data.length === 0 ? (
        <div className="card-pop mt-10 p-10 text-center">
          <ListChecks className="mx-auto size-8 text-muted-foreground" />
          <h2 className="mt-4 text-xl font-bold">No quizzes yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">Be the first to publish one.</p>
          <Button asChild variant="pop" className="mt-6">
            <Link to="/create">Create a quiz</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {data.map((quiz) => (
            <Link
              key={quiz.id}
              to="/quiz/$quizId"
              params={{ quizId: quiz.id }}
              className="card-pop flex flex-col p-6 transition-transform hover:-translate-y-1"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-fit rounded-full border-2 border-ink bg-accent px-3 py-0.5 text-xs font-bold">
                  {quiz.category}
                </span>
                {quiz.time_limit_seconds ? (
                  <span className="flex w-fit items-center gap-1 rounded-full border-2 border-ink bg-secondary px-3 py-0.5 text-xs font-bold text-secondary-foreground">
                    <Timer className="size-3" />
                    {Math.round(quiz.time_limit_seconds / 60)} min
                  </span>
                ) : null}
              </div>
              <h2 className="mt-3 text-2xl font-bold">{quiz.title}</h2>
              {quiz.description ? (
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{quiz.description}</p>
              ) : null}
              <div className="mt-5 flex items-center justify-between text-sm text-muted-foreground">
                <span>by {quiz.profiles?.display_name ?? "Anonymous"}</span>
                <span className="font-semibold text-foreground">
                  {quiz.questions?.[0]?.count ?? 0} questions
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
