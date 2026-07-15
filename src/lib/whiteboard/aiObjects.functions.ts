import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";

export type AIObjectKind =
  | "flashcard"
  | "quiz"
  | "timeline"
  | "uml"
  | "roadmap";

const Flashcards = z.object({
  items: z.array(z.object({ front: z.string(), back: z.string() })),
});
const Quizzes = z.object({
  items: z.array(
    z.object({
      question: z.string(),
      options: z.array(z.string()),
      answerIndex: z.number(),
    }),
  ),
});
const Timelines = z.object({
  title: z.string(),
  events: z.array(z.object({ date: z.string(), label: z.string() })),
});
const UMLs = z.object({
  umlType: z.enum(["class", "actor", "box"]),
  title: z.string(),
  lines: z.array(z.string()),
});
const Roadmaps = z.object({
  items: z.array(
    z.object({
      title: z.string(),
      status: z.enum(["todo", "doing", "done"]),
    }),
  ),
});

const schemas = {
  flashcard: Flashcards,
  quiz: Quizzes,
  timeline: Timelines,
  uml: UMLs,
  roadmap: Roadmaps,
};

const prompts: Record<AIObjectKind, (topic: string) => string> = {
  flashcard: (t) =>
    `Create 6 study flashcards about: ${t}. Each with a concise question front and a brief answer back.`,
  quiz: (t) =>
    `Create 5 multiple-choice quiz questions about: ${t}. Each has exactly 4 options and an answerIndex (0-3).`,
  timeline: (t) =>
    `Create a timeline for: ${t}. Include 6 chronological events with short date strings and 1-line labels.`,
  uml: (t) =>
    `Create a UML class-style description for: ${t}. Choose umlType (class/actor/box), give a title and 4-8 lines like "+ methodName(): ReturnType" or "- field: Type".`,
  roadmap: (t) =>
    `Create a 6-step project roadmap for: ${t}. Each step has a short title and a status (todo/doing/done).`,
};

export const generateLearningObjects = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        kind: z.enum(["flashcard", "quiz", "timeline", "uml", "roadmap"]),
        topic: z.string().min(1),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("Missing GEMINI_API_KEY");
    const { createGoogleProvider } = await import("@/lib/ai-gateway.server");
    const googleProvider = createGoogleProvider(key);
    const schema = schemas[data.kind];
    const { output } = await generateText({
      model: googleProvider("gemini-2.5-flash"),
      system:
        "You are an educational content generator. Output only valid JSON matching the schema. Keep text concise and accurate.",
      prompt: prompts[data.kind](data.topic),
      output: Output.object({ schema: schema as unknown as z.ZodType }),
    });
    return { kind: data.kind, topic: data.topic, output } as const;
  });
