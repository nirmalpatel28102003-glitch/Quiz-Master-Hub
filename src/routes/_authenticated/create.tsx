import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { z } from "zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/create")({
  head: () => ({
    meta: [
      { title: "Create a quiz — Quizzly" },
      {
        name: "description",
        content: "Write your questions, add four options each, mark the correct answer and publish.",
      },
      { property: "og:title", content: "Create a quiz — Quizzly" },
      {
        property: "og:description",
        content: "Build a multiple-choice quiz and share it with the world in minutes.",
      },
    ],
  }),
  component: CreateQuizPage,
});

type DraftQuestion = { prompt: string; options: string[]; correctIndex: number };

const emptyQuestion = (): DraftQuestion => ({ prompt: "", options: ["", "", "", ""], correctIndex: 0 });

const quizSchema = z.object({
  title: z.string().trim().min(3, "Give your quiz a title (3+ characters).").max(120),
  description: z.string().trim().max(400),
  category: z.string().trim().min(1).max(40),
  timeLimitMinutes: z
    .number()
    .int("Time limit must be a whole number of minutes.")
    .min(1, "Time limit must be at least 1 minute.")
    .max(120, "Time limit can't be longer than 120 minutes.")
    .nullable(),
  questions: z
    .array(
      z.object({
        prompt: z.string().trim().min(3, "Every question needs text."),
        options: z.array(z.string().trim().min(1, "Every option needs text.")).min(2).max(6),
        correctIndex: z.number().int().min(0),
      }),
    )
    .min(1, "Add at least one question."),
});


function CreateQuizPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General");
  const [timed, setTimed] = useState(false);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState("5");
  const [questions, setQuestions] = useState<DraftQuestion[]>([emptyQuestion()]);
  const [busy, setBusy] = useState(false);


  function updateQuestion(index: number, patch: Partial<DraftQuestion>) {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  }

  function updateOption(qIndex: number, oIndex: number, value: string) {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex ? { ...q, options: q.options.map((o, j) => (j === oIndex ? value : o)) } : q,
      ),
    );
  }

  async function handlePublish() {
    const parsed = quizSchema.safeParse({
      title,
      description,
      category,
      timeLimitMinutes: timed ? Number(timeLimitMinutes) : null,
      questions,
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form.");
      return;
    }

    setBusy(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("You need to be signed in.");

      const { data: quiz, error: quizError } = await supabase
        .from("quizzes")
        .insert({
          creator_id: userId,
          title: parsed.data.title,
          description: parsed.data.description,
          category: parsed.data.category,
          time_limit_seconds:
            parsed.data.timeLimitMinutes === null ? null : parsed.data.timeLimitMinutes * 60,

        })
        .select("id")
        .single();
      if (quizError) throw quizError;

      const { error: questionsError } = await supabase.from("questions").insert(
        parsed.data.questions.map((q, index) => ({
          quiz_id: quiz.id,
          prompt: q.prompt,
          options: q.options,
          correct_index: q.correctIndex,
          position: index,
        })),
      );
      if (questionsError) throw questionsError;

      toast.success("Quiz published!");
      navigate({ to: "/quiz/$quizId", params: { quizId: quiz.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not publish the quiz.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-4xl font-bold sm:text-5xl">Create a quiz</h1>
      <p className="mt-2 text-muted-foreground">
        Add your questions and mark the correct answer for each one.
      </p>

      <div className="card-pop mt-8 space-y-4 p-6">
        <div className="space-y-2">
          <Label htmlFor="title">Quiz title</Label>
          <Input
            id="title"
            value={title}
            maxLength={120}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="World capitals speedrun"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            maxLength={400}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ten questions on capital cities. No googling."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Input
            id="category"
            value={category}
            maxLength={40}
            onChange={(e) => setCategory(e.target.value)}
          />
        </div>
        <div className="space-y-3 rounded-2xl border-2 border-ink bg-background p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="timed" className="text-base">
                Time limit
              </Label>
              <p className="text-sm text-muted-foreground">
                Optional — players must finish before the clock runs out.
              </p>
            </div>
            <Switch id="timed" checked={timed} onCheckedChange={setTimed} />
          </div>
          {timed ? (
            <div className="flex items-center gap-3">
              <Input
                id="timeLimit"
                type="number"
                min={1}
                max={120}
                value={timeLimitMinutes}
                onChange={(e) => setTimeLimitMinutes(e.target.value)}
                className="w-28"
                aria-label="Time limit in minutes"
              />
              <span className="text-sm font-semibold">minutes</span>
            </div>
          ) : null}
        </div>
      </div>


      <div className="mt-8 space-y-5">
        {questions.map((question, qIndex) => (
          <div key={qIndex} className="card-pop p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Question {qIndex + 1}</h2>
              {questions.length > 1 ? (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Remove question"
                  onClick={() => setQuestions((prev) => prev.filter((_, i) => i !== qIndex))}
                >
                  <Trash2 />
                </Button>
              ) : null}
            </div>

            <div className="mt-4 space-y-2">
              <Label htmlFor={`prompt-${qIndex}`}>Question</Label>
              <Input
                id={`prompt-${qIndex}`}
                value={question.prompt}
                maxLength={300}
                onChange={(e) => updateQuestion(qIndex, { prompt: e.target.value })}
                placeholder="What is the capital of Australia?"
              />
            </div>

            <p className="mt-5 text-sm font-semibold">Options — tap the circle to mark the correct one</p>
            <div className="mt-3 space-y-3">
              {question.options.map((option, oIndex) => (
                <div key={oIndex} className="flex items-center gap-3">
                  <button
                    type="button"
                    aria-label={`Mark option ${oIndex + 1} as correct`}
                    aria-pressed={question.correctIndex === oIndex}
                    onClick={() => updateQuestion(qIndex, { correctIndex: oIndex })}
                    className={`flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-ink transition-colors ${
                      question.correctIndex === oIndex ? "bg-success" : "bg-card"
                    }`}
                  >
                    <span className="text-xs font-bold">{String.fromCharCode(65 + oIndex)}</span>
                  </button>
                  <Input
                    value={option}
                    maxLength={200}
                    onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                    placeholder={`Option ${String.fromCharCode(65 + oIndex)}`}
                  />
                  {question.options.length > 2 ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Remove option"
                      onClick={() =>
                        updateQuestion(qIndex, {
                          options: question.options.filter((_, j) => j !== oIndex),
                          correctIndex:
                            question.correctIndex >= question.options.length - 1
                              ? 0
                              : question.correctIndex,
                        })
                      }
                    >
                      <Trash2 />
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>

            {question.options.length < 6 ? (
              <Button
                variant="ghost"
                size="sm"
                className="mt-3"
                onClick={() => updateQuestion(qIndex, { options: [...question.options, ""] })}
              >
                <Plus /> Add option
              </Button>
            ) : null}
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button
          variant="popOutline"
          size="lg"
          onClick={() => setQuestions((prev) => [...prev, emptyQuestion()])}
        >
          <Plus /> Add question
        </Button>
        <Button variant="pop" size="lg" className="sm:ml-auto" onClick={handlePublish} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : null}
          Publish quiz
        </Button>
      </div>
    </div>
  );
}
