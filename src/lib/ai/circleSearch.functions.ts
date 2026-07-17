import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";

/**
 * Circle & search (AI assistant): the client crops the circled region of the
 * canvas to a PNG data URL; Gemini vision explains it — study content only.
 */
export const circleSearch = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z
      .object({
        /** PNG/JPEG data URL of the circled canvas region */
        image: z
          .string()
          .startsWith("data:image/")
          .max(4_000_000, "Selection too large — circle a smaller area"),
        question: z.string().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("Missing GEMINI_API_KEY");
    const { createGoogleProvider } = await import("@/lib/ai-gateway.server");
    const { guarded } = await import("@/lib/ai/studyGuard.server");
    const googleProvider = createGoogleProvider(key);
    const { text } = await generateText({
      model: googleProvider("gemini-2.5-flash"),
      system: guarded(
        "You are a visual study assistant. The user circled a region of their whiteboard. Identify what it shows (handwriting, diagram, formula, sketch, text) and explain it clearly like a tutor. If it contains a problem, solve it step by step. Be concise; use short markdown sections.",
      ),
      messages: [
        {
          role: "user",
          content: [
            { type: "image", image: data.image },
            {
              type: "text",
              text:
                data.question?.trim() ||
                "Explain what I circled on my whiteboard. If it's a question or problem, solve it.",
            },
          ],
        },
      ],
    });
    return { answer: text } as const;
  });
