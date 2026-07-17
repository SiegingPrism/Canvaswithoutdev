import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useWhiteboard } from "@/lib/whiteboard/store";
import { useNotes } from "@/lib/notes/store";
import { noteText } from "@/lib/notes/types";
import { objectText } from "@/lib/whiteboard/pageText";
import {
  Plus,
  NotebookPen,
  GraduationCap,
  FolderOpen,
  Presentation,
  LayoutDashboard,
} from "lucide-react";

/**
 * Global search + command palette (PRD Doc 14): full-text search across
 * boards, notes, and quick actions. Opens with ⌘K / Ctrl+K.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const boards = useWhiteboard((s) => s.boards);
  const boardOrder = useWhiteboard((s) => s.boardOrder);
  const boardData = useWhiteboard((s) => s.boardData);
  const createBoard = useWhiteboard((s) => s.createBoard);
  const notes = useNotes((s) => s.notes);
  const noteOrder = useNotes((s) => s.noteOrder);
  const createNote = useNotes((s) => s.createNote);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Search corpus: title + body text so cmdk can match content, not just names.
  const boardEntries = useMemo(() => {
    if (!open) return [];
    return boardOrder
      .map((id) => {
        const meta = boards[id];
        const data = boardData[id];
        if (!meta || meta.archived) return null;
        const body = data
          ? data.pages
              .flatMap((p) => p.objects.map(objectText))
              .filter(Boolean)
              .join(" ")
              .slice(0, 400)
          : "";
        return { id, title: meta.title, body, updatedAt: meta.updatedAt };
      })
      .filter((x): x is NonNullable<typeof x> => !!x)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 30);
  }, [open, boards, boardOrder, boardData]);

  const noteEntries = useMemo(() => {
    if (!open) return [];
    return noteOrder
      .map((id) => notes[id])
      .filter((n) => n && !n.archived)
      .map((n) => ({
        id: n.id,
        title: n.title || "Untitled note",
        body: noteText(n).slice(0, 400),
        updatedAt: n.updatedAt,
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 30);
  }, [open, notes, noteOrder]);

  function go(fn: () => void) {
    setOpen(false);
    fn();
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search boards, notes… or run a command" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Actions">
          <CommandItem
            value="new board create whiteboard"
            onSelect={() =>
              go(() => {
                const id = createBoard();
                navigate({ to: "/board/$boardId", params: { boardId: id } });
              })
            }
          >
            <Plus /> New board
          </CommandItem>
          <CommandItem
            value="new note create"
            onSelect={() =>
              go(() => {
                const id = createNote();
                navigate({ to: "/note/$noteId", params: { noteId: id } });
              })
            }
          >
            <NotebookPen /> New note
          </CommandItem>
          <CommandItem value="dashboard home" onSelect={() => go(() => navigate({ to: "/" }))}>
            <LayoutDashboard /> Dashboard
          </CommandItem>
          <CommandItem
            value="library boards all"
            onSelect={() => go(() => navigate({ to: "/library" }))}
          >
            <FolderOpen /> Board library
          </CommandItem>
          <CommandItem
            value="learn learning hub study flashcards quiz"
            onSelect={() => go(() => navigate({ to: "/learn" }))}
          >
            <GraduationCap /> Learning Hub
          </CommandItem>
        </CommandGroup>

        {boardEntries.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Boards">
              {boardEntries.map((b) => (
                <CommandItem
                  key={b.id}
                  value={`board ${b.title} ${b.body}`}
                  onSelect={() =>
                    go(() => navigate({ to: "/board/$boardId", params: { boardId: b.id } }))
                  }
                >
                  <Presentation />
                  <div className="min-w-0">
                    <div className="truncate">{b.title}</div>
                    {b.body && (
                      <div className="truncate text-xs text-muted-foreground">{b.body}</div>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {noteEntries.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Notes">
              {noteEntries.map((n) => (
                <CommandItem
                  key={n.id}
                  value={`note ${n.title} ${n.body}`}
                  onSelect={() =>
                    go(() => navigate({ to: "/note/$noteId", params: { noteId: n.id } }))
                  }
                >
                  <NotebookPen />
                  <div className="min-w-0">
                    <div className="truncate">{n.title}</div>
                    {n.body && (
                      <div className="truncate text-xs text-muted-foreground">{n.body}</div>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
