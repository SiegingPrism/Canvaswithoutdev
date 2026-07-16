import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useNotes } from "@/lib/notes/store";
import {
  NOTE_TYPE_LABELS,
  noteText,
  noteToMarkdown,
  type NoteBlock,
  type NoteBlockType,
  type NoteType,
} from "@/lib/notes/types";
import { useWhiteboard } from "@/lib/whiteboard/store";
import { runTextAction, TEXT_ACTIONS, type TextAction } from "@/lib/ai/textActions.functions";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Star,
  Download,
  Loader2,
  Link2,
  Type,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListChecks,
  Quote,
  Code,
  Lightbulb,
  Minus,
} from "lucide-react";

export const Route = createFileRoute("/note/$noteId")({
  head: () => ({
    meta: [{ title: "Note — Slate" }, { name: "robots", content: "noindex" }],
  }),
  component: NoteEditor,
});

const BLOCK_TYPES: { type: NoteBlockType; label: string; icon: typeof Type }[] = [
  { type: "text", label: "Text", icon: Type },
  { type: "h1", label: "Heading 1", icon: Heading1 },
  { type: "h2", label: "Heading 2", icon: Heading2 },
  { type: "h3", label: "Heading 3", icon: Heading3 },
  { type: "bullet", label: "Bullet list", icon: List },
  { type: "numbered", label: "Numbered list", icon: ListOrdered },
  { type: "checklist", label: "Checklist", icon: ListChecks },
  { type: "quote", label: "Quote", icon: Quote },
  { type: "code", label: "Code", icon: Code },
  { type: "callout", label: "Callout", icon: Lightbulb },
  { type: "divider", label: "Divider", icon: Minus },
];

const AI_ACTION_LABELS: Record<TextAction, string> = {
  summarize: "Summarize",
  explain: "Explain",
  rewrite: "Rewrite",
  simplify: "Simplify",
  expand: "Expand",
  shorten: "Shorten",
  proofread: "Proofread",
  keywords: "Keywords",
  translate: "Translate",
};

/** Parse a markdown-ish AI response into note blocks. */
function markdownToBlocks(md: string): Array<Pick<NoteBlock, "type" | "content">> {
  const blocks: Array<Pick<NoteBlock, "type" | "content">> = [];
  let inCode = false;
  let codeBuf: string[] = [];
  for (const raw of md.split("\n")) {
    const line = raw.trimEnd();
    if (line.trim().startsWith("```")) {
      if (inCode) {
        blocks.push({ type: "code", content: codeBuf.join("\n") });
        codeBuf = [];
      }
      inCode = !inCode;
      continue;
    }
    if (inCode) {
      codeBuf.push(raw);
      continue;
    }
    const t = line.trim();
    if (!t) continue;
    if (t.startsWith("### ")) blocks.push({ type: "h3", content: t.slice(4) });
    else if (t.startsWith("## ")) blocks.push({ type: "h2", content: t.slice(3) });
    else if (t.startsWith("# ")) blocks.push({ type: "h1", content: t.slice(2) });
    else if (/^[-*] \[[ x]\] /.test(t)) blocks.push({ type: "checklist", content: t.slice(6) });
    else if (/^[-*•] /.test(t)) blocks.push({ type: "bullet", content: t.replace(/^[-*•] /, "") });
    else if (/^\d+[.)] /.test(t))
      blocks.push({ type: "numbered", content: t.replace(/^\d+[.)] /, "") });
    else if (t.startsWith("> ")) blocks.push({ type: "quote", content: t.slice(2) });
    else if (/^-{3,}$/.test(t)) blocks.push({ type: "divider", content: "" });
    else blocks.push({ type: "text", content: t });
  }
  if (inCode && codeBuf.length) blocks.push({ type: "code", content: codeBuf.join("\n") });
  return blocks;
}

function NoteEditor() {
  const { noteId } = Route.useParams();
  const navigate = useNavigate();
  const notes = useNotes((s) => s.notes);
  const {
    renameNote,
    setNoteType,
    setNoteBoard,
    toggleFavorite,
    addBlock,
    updateBlock,
    deleteBlock,
    moveBlock,
    appendBlocks,
  } = useNotes();
  const boards = useWhiteboard((s) => s.boards);
  const boardOrder = useWhiteboard((s) => s.boardOrder);

  const note = notes[noteId];
  const [aiBusy, setAiBusy] = useState<TextAction | null>(null);
  const [aiResult, setAiResult] = useState<{ action: TextAction; text: string } | null>(null);

  const numberedIndex = useMemo(() => {
    if (!note) return new Map<string, number>();
    const map = new Map<string, number>();
    let n = 0;
    for (const b of note.blocks) {
      if (b.type === "numbered") {
        n += 1;
        map.set(b.id, n);
      } else n = 0;
    }
    return map;
  }, [note]);

  if (!note) {
    return (
      <div className="grid min-h-dvh place-items-center bg-background p-6 text-center">
        <div>
          <h1 className="text-lg font-semibold">Note not found</h1>
          <Link to="/notes" className="mt-2 inline-block text-sm text-primary underline">
            Back to notes
          </Link>
        </div>
      </div>
    );
  }

  async function runAI(action: TextAction) {
    const text = noteText(note).trim();
    if (!text) {
      toast.error("Write something first");
      return;
    }
    setAiBusy(action);
    setAiResult(null);
    try {
      const res = await runTextAction({ data: { action, text } });
      setAiResult({ action, text: res.result });
    } catch (e) {
      console.error(e);
      toast.error("AI request failed");
    } finally {
      setAiBusy(null);
    }
  }

  function insertAiResult() {
    if (!aiResult) return;
    const blocks = markdownToBlocks(aiResult.text);
    if (!blocks.length) return;
    appendBlocks(note.id, [{ type: "h3", content: AI_ACTION_LABELS[aiResult.action] }, ...blocks]);
    setAiResult(null);
    toast.success("Inserted into note");
  }

  function exportMarkdown() {
    const blob = new Blob([noteToMarkdown(note)], { type: "text/markdown" });
    const link = document.createElement("a");
    link.download = `${(note.title || "note").replace(/[^a-z0-9-_ ]/gi, "").trim() || "note"}.md`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  }

  const linkedBoard = note.boardId ? boards[note.boardId] : undefined;

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              to="/notes"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-md hover:bg-accent"
              title="All notes"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <Popover>
              <PopoverTrigger asChild>
                <button className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-accent">
                  {NOTE_TYPE_LABELS[note.type]}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-40 p-1" align="start">
                {(Object.keys(NOTE_TYPE_LABELS) as NoteType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setNoteType(note.id, t)}
                    className="flex w-full items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-accent"
                  >
                    {NOTE_TYPE_LABELS[t]}
                    {note.type === t && <span className="text-primary">✓</span>}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex items-center gap-1">
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium hover:bg-accent ${linkedBoard ? "text-primary" : "text-muted-foreground"}`}
                  title="Link to a whiteboard"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">
                    {linkedBoard ? linkedBoard.title : "Link board"}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-1" align="end">
                <button
                  onClick={() => setNoteBoard(note.id, null)}
                  className="flex w-full items-center rounded px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent"
                >
                  No linked board
                </button>
                {boardOrder
                  .map((id) => boards[id])
                  .filter((b) => b && !b.archived)
                  .slice(0, 12)
                  .map((b) => (
                    <button
                      key={b.id}
                      onClick={() => setNoteBoard(note.id, b.id)}
                      className="flex w-full items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-accent"
                    >
                      <span className="truncate">{b.title}</span>
                      {note.boardId === b.id && <span className="text-primary">✓</span>}
                    </button>
                  ))}
              </PopoverContent>
            </Popover>
            {linkedBoard && (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  navigate({ to: "/board/$boardId", params: { boardId: linkedBoard.id } })
                }
              >
                Open board
              </Button>
            )}
            <button
              className="grid h-8 w-8 place-items-center rounded-md hover:bg-accent"
              title="Favorite"
              onClick={() => toggleFavorite(note.id)}
            >
              <Star
                className={`h-4 w-4 ${note.favorite ? "fill-yellow-400 text-yellow-400" : ""}`}
              />
            </button>
            <button
              className="grid h-8 w-8 place-items-center rounded-md hover:bg-accent"
              title="Export markdown"
              onClick={exportMarkdown}
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_260px]">
        {/* Editor */}
        <main className="min-w-0">
          <input
            value={note.title}
            onChange={(e) => renameNote(note.id, e.target.value)}
            placeholder="Untitled note"
            className="w-full bg-transparent text-3xl font-bold tracking-tight outline-none placeholder:text-muted-foreground/50"
          />

          <div className="mt-6 space-y-1">
            {note.blocks.map((b, i) => (
              <BlockRow
                key={b.id}
                block={b}
                index={i}
                count={note.blocks.length}
                number={numberedIndex.get(b.id)}
                onChange={(patch) => updateBlock(note.id, b.id, patch)}
                onDelete={() => deleteBlock(note.id, b.id)}
                onMove={(dir) => moveBlock(note.id, b.id, dir)}
                onAddAfter={(type) => addBlock(note.id, type, b.id)}
              />
            ))}
          </div>

          <AddBlockButton onAdd={(type) => addBlock(note.id, type)} />
        </main>

        {/* AI sidebar (PRD Doc 4 §17) */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-xl border bg-card p-3 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-primary" /> AI actions
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Transform this note. Results are previewed before insertion.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-1.5">
              {TEXT_ACTIONS.map((a) => (
                <button
                  key={a}
                  disabled={!!aiBusy}
                  onClick={() => runAI(a)}
                  className="flex items-center justify-center gap-1 rounded-lg border border-border px-2 py-1.5 text-xs font-medium transition hover:border-primary hover:bg-accent disabled:opacity-50"
                >
                  {aiBusy === a ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                  {AI_ACTION_LABELS[a]}
                </button>
              ))}
            </div>

            {aiResult && (
              <div className="mt-3 rounded-lg border bg-background p-2">
                <div className="text-xs font-semibold text-primary">
                  {AI_ACTION_LABELS[aiResult.action]}
                </div>
                <div className="mt-1 max-h-64 overflow-y-auto whitespace-pre-wrap text-xs text-foreground">
                  {aiResult.text}
                </div>
                <div className="mt-2 flex gap-1.5">
                  <Button size="sm" className="h-7 flex-1 text-xs" onClick={insertAiResult}>
                    Insert into note
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => setAiResult(null)}
                  >
                    Discard
                  </Button>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function BlockRow({
  block,
  index,
  count,
  number,
  onChange,
  onDelete,
  onMove,
  onAddAfter,
}: {
  block: NoteBlock;
  index: number;
  count: number;
  number?: number;
  onChange: (patch: Partial<NoteBlock>) => void;
  onDelete: () => void;
  onMove: (dir: "up" | "down") => void;
  onAddAfter: (type: NoteBlockType) => void;
}) {
  const textClass =
    block.type === "h1"
      ? "text-2xl font-bold"
      : block.type === "h2"
        ? "text-xl font-semibold"
        : block.type === "h3"
          ? "text-lg font-semibold"
          : block.type === "code"
            ? "font-mono text-sm"
            : "text-[15px]";

  return (
    <div className="group relative flex items-start gap-1 rounded-lg px-1 py-0.5 transition hover:bg-accent/40">
      {/* Controls */}
      <div className="mt-1.5 flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
        <Popover>
          <PopoverTrigger asChild>
            <button
              className="grid h-5 w-5 place-items-center rounded text-muted-foreground hover:bg-accent"
              title="Block type"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-44 p-1" align="start">
            <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Turn into
            </div>
            {BLOCK_TYPES.map(({ type, label, icon: Icon }) => (
              <button
                key={type}
                onClick={() => onChange({ type })}
                className="flex w-full items-center gap-2 rounded px-2 py-1 text-xs hover:bg-accent"
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
                {block.type === type && <span className="ml-auto text-primary">✓</span>}
              </button>
            ))}
            <div className="my-1 h-px bg-border" />
            <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Insert below
            </div>
            <div className="flex flex-wrap gap-0.5 px-1 pb-1">
              {BLOCK_TYPES.slice(0, 8).map(({ type, icon: Icon, label }) => (
                <button
                  key={type}
                  title={label}
                  onClick={() => onAddAfter(type)}
                  className="grid h-6 w-6 place-items-center rounded hover:bg-accent"
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <button
          className="grid h-5 w-5 place-items-center rounded text-muted-foreground hover:bg-accent disabled:opacity-30"
          disabled={index === 0}
          onClick={() => onMove("up")}
          title="Move up"
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
        <button
          className="grid h-5 w-5 place-items-center rounded text-muted-foreground hover:bg-accent disabled:opacity-30"
          disabled={index === count - 1}
          onClick={() => onMove("down")}
          title="Move down"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
        <button
          className="grid h-5 w-5 place-items-center rounded text-muted-foreground hover:bg-accent hover:text-destructive"
          onClick={onDelete}
          title="Delete block"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {block.type === "divider" ? (
          <hr className="my-3 border-border" />
        ) : (
          <div
            className={`flex items-start gap-2 ${
              block.type === "quote"
                ? "border-l-2 border-primary/60 pl-3 italic"
                : block.type === "callout"
                  ? "rounded-lg bg-amber-500/10 p-2"
                  : block.type === "code"
                    ? "rounded-lg bg-muted p-2"
                    : ""
            }`}
          >
            {block.type === "checklist" && (
              <input
                type="checkbox"
                checked={!!block.checked}
                onChange={(e) => onChange({ checked: e.target.checked })}
                className="mt-1.5 h-4 w-4 accent-[var(--primary)]"
              />
            )}
            {block.type === "bullet" && (
              <span className="mt-1 select-none text-muted-foreground">•</span>
            )}
            {block.type === "numbered" && (
              <span className="mt-1 min-w-4 select-none text-sm text-muted-foreground">
                {number ?? 1}.
              </span>
            )}
            {block.type === "callout" && <span className="mt-0.5 select-none">💡</span>}
            <AutoTextarea
              value={block.content}
              placeholder={
                block.type === "code"
                  ? "// code"
                  : block.type.startsWith("h")
                    ? "Heading"
                    : "Type something…"
              }
              className={`${textClass} ${block.checked ? "text-muted-foreground line-through" : ""}`}
              onChange={(v) => onChange({ content: v })}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function AutoTextarea({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <textarea
      value={value}
      placeholder={placeholder}
      onChange={(e) => {
        onChange(e.target.value);
        e.target.style.height = "auto";
        e.target.style.height = `${e.target.scrollHeight}px`;
      }}
      ref={(el) => {
        if (el) {
          el.style.height = "auto";
          el.style.height = `${el.scrollHeight}px`;
        }
      }}
      rows={1}
      className={`w-full resize-none overflow-hidden bg-transparent leading-relaxed outline-none placeholder:text-muted-foreground/40 ${className ?? ""}`}
    />
  );
}

function AddBlockButton({ onAdd }: { onAdd: (type: NoteBlockType) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="mt-3 flex w-full items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground transition hover:border-primary hover:text-foreground">
          <Plus className="h-4 w-4" /> Add block
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-1" align="start">
        {BLOCK_TYPES.map(({ type, label, icon: Icon }) => (
          <button
            key={type}
            onClick={() => onAdd(type)}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent"
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
