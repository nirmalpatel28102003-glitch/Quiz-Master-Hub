import { createFileRoute, Link } from "@tanstack/react-router";
import { Brain, PenLine, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Quizzly — Make and play multiple-choice quizzes" },
      {
        name: "description",
        content:
          "Create a multiple-choice quiz in minutes, share it, and get instant scoring with answer explanations.",
      },
      { property: "og:title", content: "Quizzly — Make and play multiple-choice quizzes" },
      {
        property: "og:description",
        content: "Build a quiz, share it, and get instant scores with the correct answers revealed.",
      },
    ],
  }),
  component: Index,
});

const steps = [
  {
    icon: PenLine,
    title: "Write it",
    body: "Add questions, four options each, and mark the right answer.",
  },
  {
    icon: Brain,
    title: "Play it",
    body: "Questions appear one at a time — no scrolling, no spoilers.",
  },
  {
    icon: Trophy,
    title: "Score it",
    body: "Instant results with every correct answer revealed at the end.",
  },
];

function Index() {
  return (
    <div>
      <section className="relative overflow-hidden px-4 py-20 sm:px-6 sm:py-28">
        <div className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-secondary/50 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-24 size-80 rounded-full bg-primary/25 blur-3xl" />
        <div className="relative mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center rounded-full border-2 border-ink bg-secondary px-4 py-1 text-xs font-bold tracking-wide text-secondary-foreground uppercase shadow-pop-sm">
            Quiz night, any night
          </span>
          <h1 className="mt-6 text-5xl leading-[1.05] font-bold sm:text-7xl">
            Make a quiz. <span className="text-gradient-sunset">Watch people sweat.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            Build multiple-choice quizzes in a couple of minutes, then let anyone play and get
            scored the second they finish.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild variant="pop" size="xl">
              <Link to="/quizzes">Take a quiz</Link>
            </Button>
            <Button asChild variant="popOutline" size="xl">
              <Link to="/create">Create a quiz</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="px-4 pb-24 sm:px-6">
        <div className="mx-auto grid max-w-5xl gap-5 sm:grid-cols-3">
          {steps.map((step) => (
            <div key={step.title} className="card-pop p-6">
              <span className="flex size-11 items-center justify-center rounded-xl border-2 border-ink bg-accent">
                <step.icon className="size-5" />
              </span>
              <h2 className="mt-4 text-xl font-bold">{step.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
