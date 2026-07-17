import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";

export type AIObjectKind = "flashcard" | "quiz" | "timeline" | "uml" | "roadmap" | "mindmap";

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
const MindMaps = z.object({
  title: z.string(),
  branches: z.array(
    z.object({
      label: z.string(),
      children: z.array(z.string()),
    }),
  ),
});

const schemas = {
  flashcard: Flashcards,
  quiz: Quizzes,
  timeline: Timelines,
  uml: UMLs,
  roadmap: Roadmaps,
  mindmap: MindMaps,
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
  mindmap: (t) =>
    `Create a mind map for: ${t}. Give a short central title and 4-6 branches, each with a 1-3 word label and 2-4 short child items.`,
};

export const generateLearningObjects = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z
      .object({
        kind: z.enum(["flashcard", "quiz", "timeline", "uml", "roadmap", "mindmap"]),
        topic: z.string().min(1),
        /** Optional board/notes context (PRD Doc 5 §10 — context sources) */
        context: z.string().max(12000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("Missing GEMINI_API_KEY");
    const { createGoogleProvider } = await import("@/lib/ai-gateway.server");
    const googleProvider = createGoogleProvider(key);
    const schema = schemas[data.kind];
    const contextPart = data.context
      ? `\n\nUse this workspace content as the primary source material:\n"""\n${data.context}\n"""`
      : "";
    const { guarded } = await import("@/lib/ai/studyGuard.server");
    const { output } = await generateText({
      model: googleProvider("gemini-2.5-flash"),
      system: guarded(
        "You are an educational content generator. Output only valid JSON matching the schema. Keep text concise and accurate. If the topic is not educational, generate content that redirects to studying instead.",
      ),
      prompt: prompts[data.kind](data.topic) + contextPart,
      output: Output.object({ schema: schema as unknown as z.ZodType }),
    });
    return { kind: data.kind, topic: data.topic, output } as const;
  });
