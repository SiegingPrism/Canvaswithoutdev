import { create } from "zustand";
import { emptyTable, type Note, type NoteBlock, type NoteBlockType, type NoteType } from "./types";

const STORAGE_KEY = "notes.v1";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}
function nowMs() {
  return Date.now();
}

type PersistShape = {
  notes: Record<string, Note>;
  noteOrder: string[];
};

function emptyPersist(): PersistShape {
  return { notes: {}, noteOrder: [] };
}

function load(): PersistShape {
  if (typeof window === "undefined") return emptyPersist();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...emptyPersist(), ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return emptyPersist();
}

function save(s: PersistShape) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export function emptyBlock(type: NoteBlockType = "text"): NoteBlock {
  return {
    id: uid(),
    type,
    content: type === "table" ? emptyTable() : "",
    ...(type === "checklist" ? { checked: false } : {}),
  };
}

type Actions = {
  createNote: (opts?: { title?: string; type?: NoteType; boardId?: string | null }) => string;
  deleteNote: (id: string) => void;
  duplicateNote: (id: string) => string | null;
  renameNote: (id: string, title: string) => void;
  setNoteTags: (id: string, tags: string[]) => void;
  setNoteType: (id: string, type: NoteType) => void;
  setNoteBoard: (id: string, boardId: string | null) => void;
  toggleFavorite: (id: string) => void;
  toggleArchive: (id: string) => void;

  // Block operations (PRD Doc 4 FR-1/FR-2)
  addBlock: (noteId: string, type: NoteBlockType, afterBlockId?: string) => string;
  updateBlock: (noteId: string, blockId: string, patch: Partial<NoteBlock>) => void;
  deleteBlock: (noteId: string, blockId: string) => void;
  moveBlock: (noteId: string, blockId: string, dir: "up" | "down") => void;
  appendBlocks: (noteId: string, blocks: Array<Pick<NoteBlock, "type" | "content">>) => void;
};

type State = PersistShape;

export const useNotes = create<State & Actions>((set, get) => {
  const initial = load();

  function mutateNote(id: string, fn: (n: Note) => Note) {
    const s = get();
    const note = s.notes[id];
    if (!note) return;
    const notes = { ...s.notes, [id]: { ...fn(note), updatedAt: nowMs() } };
    const next = { notes, noteOrder: s.noteOrder };
    save(next);
    set(next);
  }

  return {
    ...initial,

    createNote: (opts) => {
      const s = get();
      const id = uid();
      const note: Note = {
        id,
        title: opts?.title ?? "",
        type: opts?.type ?? "standard",
        tags: [],
        blocks: [emptyBlock("text")],
        boardId: opts?.boardId ?? null,
        favorite: false,
        archived: false,
        createdAt: nowMs(),
        updatedAt: nowMs(),
      };
      const next = { notes: { ...s.notes, [id]: note }, noteOrder: [id, ...s.noteOrder] };
      save(next);
      set(next);
      return id;
    },
    deleteNote: (id) => {
      const s = get();
      const { [id]: _gone, ...notes } = s.notes;
      const next = { notes, noteOrder: s.noteOrder.filter((n) => n !== id) };
      save(next);
      set(next);
    },
    duplicateNote: (id) => {
      const s = get();
      const src = s.notes[id];
      if (!src) return null;
      const newId = uid();
      const clone: Note = {
        ...structuredClone(src),
        id: newId,
        title: `${src.title || "Untitled"} (copy)`,
        favorite: false,
        createdAt: nowMs(),
        updatedAt: nowMs(),
      };
      const next = { notes: { ...s.notes, [newId]: clone }, noteOrder: [newId, ...s.noteOrder] };
      save(next);
      set(next);
      return newId;
    },
    renameNote: (id, title) => mutateNote(id, (n) => ({ ...n, title })),
    setNoteTags: (id, tags) => mutateNote(id, (n) => ({ ...n, tags })),
    setNoteType: (id, type) => mutateNote(id, (n) => ({ ...n, type })),
    setNoteBoard: (id, boardId) => mutateNote(id, (n) => ({ ...n, boardId })),
    toggleFavorite: (id) => mutateNote(id, (n) => ({ ...n, favorite: !n.favorite })),
    toggleArchive: (id) => mutateNote(id, (n) => ({ ...n, archived: !n.archived })),

    addBlock: (noteId, type, afterBlockId) => {
      const block = emptyBlock(type);
      mutateNote(noteId, (n) => {
        const blocks = [...n.blocks];
        const i = afterBlockId ? blocks.findIndex((b) => b.id === afterBlockId) : -1;
        if (i >= 0) blocks.splice(i + 1, 0, block);
        else blocks.push(block);
        return { ...n, blocks };
      });
      return block.id;
    },
    updateBlock: (noteId, blockId, patch) =>
      mutateNote(noteId, (n) => ({
        ...n,
        blocks: n.blocks.map((b) => (b.id === blockId ? { ...b, ...patch } : b)),
      })),
    deleteBlock: (noteId, blockId) =>
      mutateNote(noteId, (n) => ({
        ...n,
        blocks: n.blocks.length > 1 ? n.blocks.filter((b) => b.id !== blockId) : n.blocks,
      })),
    moveBlock: (noteId, blockId, dir) =>
      mutateNote(noteId, (n) => {
        const i = n.blocks.findIndex((b) => b.id === blockId);
        const j = dir === "up" ? i - 1 : i + 1;
        if (i < 0 || j < 0 || j >= n.blocks.length) return n;
        const blocks = [...n.blocks];
        [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
        return { ...n, blocks };
      }),
    appendBlocks: (noteId, newBlocks) =>
      mutateNote(noteId, (n) => ({
        ...n,
        blocks: [
          ...n.blocks,
          ...newBlocks.map((b) => ({ ...emptyBlock(b.type), content: b.content })),
        ],
      })),
  };
});
