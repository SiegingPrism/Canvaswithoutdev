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
  | "divider"
  /** PRD Doc 11: editable table — content is a JSON string[][] */
  | "table"
  /** PRD Doc 11: recorded audio note — content is a data URL */
  | "audio";

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
      case "table": {
        const rows = parseTable(b.content);
        if (rows.length) {
          lines.push(`| ${rows[0].join(" | ")} |`);
          lines.push(`| ${rows[0].map(() => "---").join(" | ")} |`);
          for (const row of rows.slice(1)) lines.push(`| ${row.join(" | ")} |`);
        }
        break;
      }
      case "audio":
        lines.push("_[audio note]_");
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
  return [
    note.title,
    ...note.blocks.map((b) => {
      if (b.type === "audio") return "";
      if (b.type === "table") return parseTable(b.content).flat().join(" ");
      return b.content;
    }),
  ]
    .filter(Boolean)
    .join("\n");
}

/** Parse a table block's JSON content into rows, tolerating bad data. */
export function parseTable(content: string): string[][] {
  try {
    const data = JSON.parse(content);
    if (Array.isArray(data) && data.every((r) => Array.isArray(r))) {
      return data.map((r: unknown[]) => r.map((c) => String(c ?? "")));
    }
  } catch {
    /* ignore */
  }
  return [];
}

export function emptyTable(): string {
  return JSON.stringify([
    ["Column 1", "Column 2"],
    ["", ""],
  ]);
}

// ---- Backlinks (PRD Doc 11 §14): [[Note Title]] references ----

/** Titles referenced from this note via [[...]] syntax. */
export function extractRefs(note: Note): string[] {
  const found = new Set<string>();
  for (const b of note.blocks) {
    if (b.type === "audio" || b.type === "table") continue;
    for (const m of b.content.matchAll(/\[\[([^\]]+)\]\]/g)) {
      const t = m[1].trim();
      if (t) found.add(t.toLowerCase());
    }
  }
  return Array.from(found);
}
