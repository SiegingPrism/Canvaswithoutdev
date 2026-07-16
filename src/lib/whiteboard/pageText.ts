import type { CanvasObject, Page } from "./types";

/** Extract readable text from a single canvas object (AI context engine, PRD Doc 5 §10). */
export function objectText(o: CanvasObject): string {
  switch (o.kind) {
    case "text":
    case "sticky":
      return o.text;
    case "flashcard":
      return `${o.front} — ${o.back}`;
    case "quiz":
      return `${o.question} (${o.options.join(" / ")})`;
    case "roadmap":
      return `${o.title} [${o.status}]`;
    case "timeline":
      return [o.title, ...o.events.map((e) => `${e.date}: ${e.label}`)].join("\n");
    case "uml":
      return [o.title, ...o.lines].join("\n");
    case "video":
    case "audio":
      return o.title ?? "";
    default:
      return "";
  }
}

/** All readable text on a page, used as whole-board AI context. */
export function pageText(page: Page | undefined): string {
  if (!page) return "";
  return page.objects
    .map(objectText)
    .map((t) => t.trim())
    .filter(Boolean)
    .join("\n---\n")
    .slice(0, 12000);
}
