import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createGoogleProvider } from "@/lib/ai-gateway.server";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as { messages?: UIMessage[]; system?: string };
        const key = process.env.GEMINI_API_KEY;
        if (!key) return new Response("Missing GEMINI_API_KEY", { status: 500 });
        if (!Array.isArray(body.messages)) return new Response("messages required", { status: 400 });

        const googleProvider = createGoogleProvider(key);
        const model = googleProvider("gemini-2.5-flash");
        const result = streamText({
          model,
          system:
            body.system ??
            "You are a helpful classroom teaching assistant embedded in a whiteboard app. Be concise, use markdown headings and bullet points, and support students and teachers. When asked to generate questions, format them with numbered items and clearly mark answers.",
          messages: await convertToModelMessages(body.messages),
        });
        return result.toUIMessageStreamResponse();
      },
    },
  },
});
