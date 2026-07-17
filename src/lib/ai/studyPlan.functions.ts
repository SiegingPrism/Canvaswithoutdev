import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";

// AI study planner (PRD Doc 12 §13): goal + exam date + hours → structured plan.

const StudyPlanSchema = z.object({
  title: z.string(),
  overview: z.string(),
  days: z.array(
    z.object({
      day: z.string(),
      focus: z.string(),
      tasks: z.array(z.string()),
    }),
  ),
  tips: z.array(z.string()),
});

export type StudyPlan = z.infer<typeof StudyPlanSchema>;

export const generateStudyPlan = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z
      .object({
        goal: z.string().min(1).max(500),
        examDate: z.string().max(40).optional(),
        hoursPerDay: z.number().min(0.5).max(16),
        context: z.string().max(8000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("Missing GEMINI_API_KEY");
    const { createGoogleProvider } = await import("@/lib/ai-gateway.server");
    const googleProvider = createGoogleProvider(key);
    const { guarded } = await import("@/lib/ai/studyGuard.server");
    const { output } = await generateText({
      model: googleProvider("gemini-2.5-flash"),
      system: guarded(
        "You are a study planning expert. Output only valid JSON matching the schema. Create realistic, specific daily plans. 'day' values like 'Day 1 — Mon', focus is a short topic label, tasks are concrete 15-60 minute activities. 5-14 days depending on the timeframe.",
      ),
      prompt:
        `Create a study plan.\nGoal: ${data.goal}\n` +
        (data.examDate
          ? `Exam date: ${data.examDate} (today is ${new Date().toDateString()})\n`
          : "") +
        `Available: ${data.hoursPerDay} hours/day.` +
        (data.context ? `\n\nBase it on this material:\n"""\n${data.context}\n"""` : ""),
      output: Output.object({ schema: StudyPlanSchema as unknown as z.ZodType }),
    });
    return { plan: output as StudyPlan } as const;
  });
