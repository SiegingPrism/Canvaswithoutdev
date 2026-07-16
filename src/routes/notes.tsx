import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useNotes } from "@/lib/notes/store";
import { NOTE_TYPE_LABELS, noteText } from "@/lib/notes/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Plus,
  Search,
  Star,
  Archive,
  Copy,
  Trash2,
  MoreVertical,
  ArrowLeft,
  NotebookPen,
  Tag as TagIcon,
} from "lucide-react";

export const Route = createFileRoute("/notes")({
  head: () => ({
    meta: [
      { title: "Notes — Slate" },
      { name: "description", content: "Rich notes linked to your whiteboards, with AI actions." },
    ],
  }),
  component: NotesPage,
});

function relTime(t: number) {
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

type Filter = "all" | "favorites" | "archived";

function NotesPage() {
  const navigate = useNavigate();
  const {
    notes,
    noteOrder,
    createNote,
    deleteNote,
    duplicateNote,
    toggleFavorite,
    toggleArchive,
    setNoteTags,
  } = useNotes();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    for (const id of noteOrder) notes[id]?.tags.forEach((t) => s.add(t));
    return Array.from(s).sort();
  }, [notes, noteOrder]);

  const visible = useMemo(() => {
    return noteOrder
      .map((id) => notes[id])
      .filter(Boolean)
      .filter((n) => {
        if (filter === "favorites") return n.favorite && !n.archived;
        if (filter === "archived") return n.archived;
        return !n.archived;
      })
      .filter((n) => (tagFilter ? n.tags.includes(tagFilter) : true))
      .filter((n) => (query ? noteText(n).toLowerCase().includes(query.toLowerCase()) : true))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [notes, noteOrder, filter, tagFilter, query]);

  function openNew() {
    const id = createNote();
    navigate({ to: "/note/$noteId", params: { noteId: id } });
  }

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="grid h-8 w-8 place-items-center rounded-md hover:bg-accent"
              title="Dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="flex items-center gap-2 font-semibold">
              <NotebookPen className="h-4 w-4 text-primary" /> Notes
            </h1>
          </div>
          <Button size="sm" onClick={openNew}>
            <Plus className="h-4 w-4" /> New note
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search notes (title & content)"
              className="pl-9"
            />
          </div>
          {(["all", "favorites", "archived"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize transition ${
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {allTags.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1.5">
            <button
              onClick={() => setTagFilter(null)}
              className={`rounded-full px-2 py-0.5 text-xs ${!tagFilter ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}
            >
              All tags
            </button>
            {allTags.map((t) => (
              <button
                key={t}
                onClick={() => setTagFilter(t === tagFilter ? null : t)}
                className={`rounded-full px-2 py-0.5 text-xs ${tagFilter === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}
              >
                #{t}
              </button>
            ))}
          </div>
        )}

        {visible.length === 0 ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed p-16 text-center">
            <NotebookPen className="h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">No notes here</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Capture ideas, then turn them into flashcards and quizzes with AI.
            </p>
            <Button size="sm" className="mt-4" onClick={openNew}>
              <Plus className="h-4 w-4" /> New note
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((n) => {
              const preview = n.blocks
                .map((b) => b.content)
                .filter(Boolean)
                .join(" · ")
                .slice(0, 140);
              return (
                <div
                  key={n.id}
                  className="group relative flex flex-col rounded-xl border bg-card p-4 shadow-sm transition hover:border-primary hover:shadow-md"
                >
                  <button
                    onClick={() => navigate({ to: "/note/$noteId", params: { noteId: n.id } })}
                    className="absolute inset-0 z-0"
                    aria-label={`Open ${n.title || "Untitled note"}`}
                  />
                  <div className="pointer-events-none flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        {n.favorite && (
                          <Star className="h-3.5 w-3.5 shrink-0 fill-yellow-400 text-yellow-400" />
                        )}
                        <span className="truncate text-sm font-semibold">
                          {n.title || "Untitled note"}
                        </span>
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {NOTE_TYPE_LABELS[n.type]} · {relTime(n.updatedAt)}
                      </div>
                    </div>
                  </div>
                  <p className="pointer-events-none mt-2 line-clamp-3 flex-1 text-xs text-muted-foreground">
                    {preview || "Empty note"}
                  </p>
                  {n.tags.length > 0 && (
                    <div className="pointer-events-none mt-2 flex flex-wrap gap-1">
                      {n.tags.slice(0, 4).map((t) => (
                        <Badge key={t} variant="secondary" className="text-[10px]">
                          #{t}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="absolute right-2 top-2 z-10 opacity-0 transition group-hover:opacity-100">
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          className="grid h-7 w-7 place-items-center rounded-md bg-background/70 hover:bg-accent"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-44 p-1"
                        align="end"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <NoteMenuItem
                          icon={<Star className="h-3.5 w-3.5" />}
                          onClick={() => toggleFavorite(n.id)}
                        >
                          {n.favorite ? "Unfavorite" : "Favorite"}
                        </NoteMenuItem>
                        <NoteMenuItem
                          icon={<Copy className="h-3.5 w-3.5" />}
                          onClick={() => duplicateNote(n.id)}
                        >
                          Duplicate
                        </NoteMenuItem>
                        <NoteMenuItem
                          icon={<TagIcon className="h-3.5 w-3.5" />}
                          onClick={() => {
                            const t = prompt("Tags (comma separated)", n.tags.join(", "));
                            if (t !== null)
                              setNoteTags(
                                n.id,
                                t
                                  .split(",")
                                  .map((x) => x.trim())
                                  .filter(Boolean),
                              );
                          }}
                        >
                          Edit tags
                        </NoteMenuItem>
                        <NoteMenuItem
                          icon={<Archive className="h-3.5 w-3.5" />}
                          onClick={() => toggleArchive(n.id)}
                        >
                          {n.archived ? "Restore" : "Archive"}
                        </NoteMenuItem>
                        <div className="my-1 h-px bg-border" />
                        <NoteMenuItem
                          icon={<Trash2 className="h-3.5 w-3.5" />}
                          destructive
                          onClick={() => {
                            if (confirm("Delete this note? This can't be undone."))
                              deleteNote(n.id);
                          }}
                        >
                          Delete
                        </NoteMenuItem>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function NoteMenuItem({
  icon,
  children,
  onClick,
  destructive,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent ${destructive ? "text-destructive" : ""}`}
    >
      {icon}
      {children}
    </button>
  );
}
