import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";

// AI writing & learning actions (PRD Doc 4 §16, Doc 5 §6)
export const TEXT_ACTIONS = [
  "summarize",
  "explain",
  "rewrite",
  "simplify",
  "expand",
  "shorten",
  "proofread",
  "keywords",
  "translate",
] as const;

export type TextAction = (typeof TEXT_ACTIONS)[number];

const instructions: Record<TextAction, string> = {
  summarize: "Summarize the content into a concise set of key points. Keep it short and scannable.",
  explain: "Explain the content step by step in simple language, as a teacher would to a student.",
  rewrite: "Rewrite the content to be clearer and better structured, preserving its meaning.",
  simplify: "Simplify the content so a beginner can understand it. Use plain words.",
  expand: "Expand the content with helpful detail, examples, and context.",
  shorten: "Shorten the content as much as possible without losing meaning.",
  proofread: "Fix grammar, spelling, and punctuation. Return the corrected text only.",
  keywords:
    "Extract the most important keywords and terms as a short list with 1-line definitions.",
  translate:
    "Translate the content. If a target language is given in the extra instruction, use it; otherwise translate to English.",
};

export const runTextAction = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        action: z.enum(TEXT_ACTIONS),
        text: z.string().min(1).max(24000),
        extra: z.string().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("Missing GEMINI_API_KEY");
    const { createGoogleProvider } = await import("@/lib/ai-gateway.server");
    const googleProvider = createGoogleProvider(key);
    const { text } = await generateText({
      model: googleProvider("gemini-2.5-flash"),
      system:
        "You are a writing and learning assistant inside a visual workspace. Respond with the transformed content only — no preamble, no meta commentary. Use markdown lists/headings when it improves readability.",
      prompt: `${instructions[data.action]}${data.extra ? `\nExtra instruction: ${data.extra}` : ""}\n\nContent:\n"""\n${data.text}\n"""`,
    });
    return { action: data.action, result: text } as const;
  });
