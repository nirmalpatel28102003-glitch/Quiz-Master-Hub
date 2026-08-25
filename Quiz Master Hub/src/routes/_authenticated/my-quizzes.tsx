import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/my-quizzes")({
  head: () => ({
    meta: [
      { title: "My quizzes — Quizzly" },
      { name: "description", content: "The quizzes you created and the quizzes you have played." },
      { property: "og:title", content: "My quizzes — Quizzly" },
      { property: "og:description", content: "Manage the quizzes you built and review your scores." },
    ],
  }),
  component: MyQuizzesPage,
});

async function fetchMine() {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return { quizzes: [], attempts: [] };

  const [quizzes, attempts] = await Promise.all([
    supabase
      .from("quizzes")
      .select("id, title, category, created_at, questions(id)")
      .eq("creator_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("attempts")
      .select("id, score, total, created_at, quizzes(id, title)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (quizzes.error) throw new Error(quizzes.error.message);
  if (attempts.error) throw new Error(attempts.error.message);
  return { quizzes: quizzes.data ?? [], attempts: attempts.data ?? [] };
}

function MyQuizzesPage() {
  const { data, isPending, error } = useQuery({ queryKey: ["my-quizzes"], queryFn: fetchMine });

  if (isPending) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return <p className="py-24 text-center text-destructive">Couldn't load your quizzes.</p>;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="text-4xl font-bold sm:text-5xl">My quizzes</h1>

      <section className="mt-8">
        <h2 className="text-xl font-bold">Created by you</h2>
        {data.quizzes.length === 0 ? (
          <div className="card-pop mt-4 p-8 text-center">
            <p className="text-sm text-muted-foreground">You haven't made a quiz yet.</p>
            <Button asChild variant="pop" className="mt-5">
              <Link to="/create">Create your first quiz</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {data.quizzes.map((quiz) => (
              <Link
                key={quiz.id}
                to="/quiz/$quizId"
                params={{ quizId: quiz.id }}
                className="card-pop p-5 transition-transform hover:-translate-y-1"
              >
                <span className="w-fit rounded-full border-2 border-ink bg-accent px-3 py-0.5 text-xs font-bold">
                  {quiz.category}
                </span>
                <h3 className="mt-3 text-lg font-bold">{quiz.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {(quiz.questions as unknown as { id: string }[])?.length ?? 0} questions
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-bold">Your recent scores</h2>
        {data.attempts.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No attempts recorded yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {data.attempts.map((attempt) => {
              const quiz = attempt.quizzes as unknown as { id: string; title: string } | null;
              return (
                <li
                  key={attempt.id}
                  className="card-pop flex items-center justify-between gap-4 px-5 py-4"
                >
                  <span className="font-semibold">{quiz?.title ?? "Deleted quiz"}</span>
                  <span className="shrink-0 rounded-full border-2 border-ink bg-secondary px-3 py-1 text-sm font-bold text-secondary-foreground">
                    {attempt.score}/{attempt.total}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
