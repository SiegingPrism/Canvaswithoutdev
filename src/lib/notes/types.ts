// Rich Notes System — PRD Doc 4

export type NoteBlockType =
  | "text"
  | "h1"
  | "h2"
  | "h3"
  | "bullet"
  | "numbered"
  | "checklist"
  | "quote"
  | "code"
  | "callout"
  | "divider";

export type NoteBlock = {
  id: string;
  type: NoteBlockType;
  content: string;
  /** checklist only */
  checked?: boolean;
  /** code only */
  language?: string;
};

export type NoteType = "standard" | "quick" | "lecture" | "research" | "code" | "meeting";

export type Note = {
  id: string;
  title: string;
  type: NoteType;
  tags: string[];
  blocks: NoteBlock[];
  /** Linked whiteboard (PRD Doc 4 — Notes + Whiteboard integration) */
  boardId: string | null;
  favorite: boolean;
  archived: boolean;
  createdAt: number;
  updatedAt: number;
};

export const NOTE_TYPE_LABELS: Record<NoteType, string> = {
  standard: "Standard",
  quick: "Quick note",
  lecture: "Lecture",
  research: "Research",
  code: "Code",
  meeting: "Meeting",
};

export function noteToMarkdown(note: Note): string {
  const lines: string[] = [`# ${note.title || "Untitled note"}`, ""];
  let num = 0;
  for (const b of note.blocks) {
    if (b.type !== "numbered") num = 0;
    switch (b.type) {
      case "h1":
        lines.push(`# ${b.content}`);
        break;
      case "h2":
        lines.push(`## ${b.content}`);
        break;
      case "h3":
        lines.push(`### ${b.content}`);
        break;
      case "bullet":
        lines.push(`- ${b.content}`);
        break;
      case "numbered":
        num += 1;
        lines.push(`${num}. ${b.content}`);
        break;
      case "checklist":
        lines.push(`- [${b.checked ? "x" : " "}] ${b.content}`);
        break;
      case "quote":
        lines.push(`> ${b.content}`);
        break;
      case "code":
        lines.push("```" + (b.language ?? ""), b.content, "```");
        break;
      case "callout":
        lines.push(`> 💡 ${b.content}`);
        break;
      case "divider":
        lines.push("---");
        break;
      default:
        lines.push(b.content);
    }
    lines.push("");
  }
  return lines.join("\n");
}

/** Plain text of a note — used as AI context and for search. */
export function noteText(note: Note): string {
  return [note.title, ...note.blocks.map((b) => b.content)].filter(Boolean).join("\n");
}
