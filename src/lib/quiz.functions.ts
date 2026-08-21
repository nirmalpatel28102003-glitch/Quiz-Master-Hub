import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const gradeInput = z.object({
  quizId: z.string().uuid(),
  answers: z.record(z.string().uuid(), z.number().int().min(-1).max(9)),
});

export type GradedQuestion = {
  questionId: string;
  correctIndex: number;
  selectedIndex: number;
  isCorrect: boolean;
  explanation: string;
};

export type GradeResult = {
  score: number;
  total: number;
  questions: GradedQuestion[];
};

/**
 * Grading happens on the server so correct answers are never shipped to the
 * browser before the quiz is submitted.
 */
export const gradeQuiz = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => gradeInput.parse(input))
  .handler(async ({ data }): Promise<GradeResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: rows, error } = await supabaseAdmin
      .from("questions")
      .select("id, correct_index")
      .eq("quiz_id", data.quizId);

    if (error) throw new Error(error.message);
    if (!rows || rows.length === 0) throw new Error("This quiz has no questions.");

    const questions: GradedQuestion[] = rows.map((row) => {
      const selectedIndex = data.answers[row.id] ?? -1;
      return {
        questionId: row.id,
        correctIndex: row.correct_index,
        selectedIndex,
        isCorrect: selectedIndex === row.correct_index,
      };
    });

    return {
      score: questions.filter((q) => q.isCorrect).length,
      total: questions.length,
      questions,
    };
  });

const attemptInput = z.object({
  quizId: z.string().uuid(),
  score: z.number().int().min(0),
  total: z.number().int().min(1),
});

export const saveAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => attemptInput.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("attempts").insert({
      quiz_id: data.quizId,
      user_id: context.userId,
      score: data.score,
      total: data.total,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
