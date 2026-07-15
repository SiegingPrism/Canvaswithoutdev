import { create } from "zustand";
import type {
  BackgroundStyle,
  CanvasObject,
  Page,
  ToolId,
  WhiteboardState,
} from "./types";
import { pagesForTemplate, type TemplateKey } from "./templates";


const STORAGE_KEY = "whiteboard.multi.v1";
const LEGACY_KEY = "whiteboard.v1";
const PREFS_KEY = "whiteboard.prefs.v1";

type Prefs = {
  toolColors: Partial<Record<ToolId, string>>;
  recentColors: string[];
  favoriteColors: string[];
  autoRecognizeShape: boolean;
};

function defaultPrefs(): Prefs {
  return {
    toolColors: { pen: "#111827", highlighter: "#facc15", rainbow: "#ef4444", shape: "#0ea5e9", text: "#111827" },
    recentColors: [],
    favoriteColors: [],
    autoRecognizeShape: true,
  };
}

function loadPrefs(): Prefs {
  if (typeof window === "undefined") return defaultPrefs();
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return defaultPrefs();
    return { ...defaultPrefs(), ...JSON.parse(raw) };
  } catch {
    return defaultPrefs();
  }
}

function savePrefs(p: Prefs) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}
function nowMs() {
  return Date.now();
}


function emptyPage(background: Page["background"] = "white"): Page {
  return { id: uid(), objects: [], background };
}

export type BoardMeta = {
  id: string;
  title: string;
  tags: string[];
  folderId: string | null;
  favorite: boolean;
  archived: boolean;
  createdAt: number;
  updatedAt: number;
  templateKey?: TemplateKey;
  thumbnail?: string;
};

export type Folder = { id: string; name: string };
export type RecentAI = {
  id: string;
  prompt: string;
  response: string;
  boardId: string | null;
  createdAt: number;
};
type BoardData = { pages: Page[]; activePageId: string };

type PersistShape = {
  boards: Record<string, BoardMeta>;
  boardOrder: string[];
  boardData: Record<string, BoardData>;
  folders: Folder[];
  recentAI: RecentAI[];
};

function emptyPersist(): PersistShape {
  return { boards: {}, boardOrder: [], boardData: {}, folders: [], recentAI: [] };
}

function load(): PersistShape {
  if (typeof window === "undefined") return emptyPersist();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...emptyPersist(), ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  try {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const data = JSON.parse(legacy);
      const id = uid();
      const pages: Page[] = data.pages?.length ? data.pages : [emptyPage()];
      const meta: BoardMeta = {
        id,
        title: "Untitled board",
        tags: [],
        folderId: null,
        favorite: false,
        archived: false,
        createdAt: nowMs(),
        updatedAt: nowMs(),
      };
      return {
        boards: { [id]: meta },
        boardOrder: [id],
        boardData: { [id]: { pages, activePageId: data.activePageId ?? pages[0].id } },
        folders: [],
        recentAI: [],
      };
    }
  } catch {
    /* ignore */
  }
  return emptyPersist();
}

function savePersist(s: PersistShape) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

type Actions = {
  // Runtime tool state
  setTool: (tool: ToolId) => void;
  setColor: (color: string) => void;
  setSize: (size: number) => void;
  setSelected: (id: string | null) => void;
  setCamera: (c: { x: number; y: number; zoom: number }) => void;
  // Active board content
  addObject: (obj: CanvasObject) => void;
  addObjects: (objs: CanvasObject[]) => void;
  updateObject: (id: string, patch: Partial<CanvasObject>) => void;
  deleteObject: (id: string) => void;
  clearPage: () => void;
  addPage: () => void;
  removePage: (id: string) => void;
  setActivePage: (id: string) => void;
  nextPage: () => void;
  prevPage: () => void;
  setBackground: (bg: Page["background"]) => void;
  setBackgroundStyle: (style: BackgroundStyle) => void;
  setBackgroundColor: (color: string) => void;
  setToolColor: (tool: ToolId, color: string) => void;
  toggleFavoriteColor: (color: string) => void;
  setAutoRecognizeShape: (v: boolean) => void;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;

  // Board CRUD
  createBoard: (opts?: { title?: string; templateKey?: TemplateKey; folderId?: string | null }) => string;
  openBoard: (id: string) => void;
  renameBoard: (id: string, title: string) => void;
  deleteBoard: (id: string) => void;
  duplicateBoard: (id: string) => string;
  toggleFavorite: (id: string) => void;
  toggleArchive: (id: string) => void;
  setBoardTags: (id: string, tags: string[]) => void;
  setBoardFolder: (id: string, folderId: string | null) => void;
  setBoardThumbnail: (id: string, dataUrl: string) => void;

  // Folders
  createFolder: (name: string) => string;
  renameFolder: (id: string, name: string) => void;
  deleteFolder: (id: string) => void;
  // AI history
  addRecentAI: (item: Omit<RecentAI, "id" | "createdAt">) => void;
  clearRecentAI: () => void;
};

type State = WhiteboardState & PersistShape & { activeBoardId: string | null };

function syncActive(state: State): State {
  if (!state.activeBoardId) return state;
  const boardData = {
    ...state.boardData,
    [state.activeBoardId]: { pages: state.pages, activePageId: state.activePageId },
  };
  const meta = state.boards[state.activeBoardId];
  const boards = meta
    ? { ...state.boards, [state.activeBoardId]: { ...meta, updatedAt: nowMs() } }
    : state.boards;
  const next = { ...state, boardData, boards };
  savePersist({
    boards: next.boards,
    boardOrder: next.boardOrder,
    boardData: next.boardData,
    folders: next.folders,
    recentAI: next.recentAI,
  });
  return next;
}

function persistMeta(state: State) {
  savePersist({
    boards: state.boards,
    boardOrder: state.boardOrder,
    boardData: state.boardData,
    folders: state.folders,
    recentAI: state.recentAI,
  });
}

export const useWhiteboard = create<State & Actions>((set, get) => {
  const initial = load();
  const prefs = loadPrefs();
  const initialColor = prefs.toolColors.pen ?? "#111827";
  return {
    // persist
    ...initial,
    activeBoardId: null,
    // whiteboard runtime
    pages: [emptyPage()],
    activePageId: "temp",
    tool: "pen",
    color: initialColor,
    size: 3,
    history: [],
    historyIndex: -1,
    selectedId: null,
    camera: { x: 0, y: 0, zoom: 1 },
    toolColors: prefs.toolColors,
    recentColors: prefs.recentColors,
    favoriteColors: prefs.favoriteColors,
    autoRecognizeShape: prefs.autoRecognizeShape,

    setTool: (tool) => {
      const s = get();
      const saved = s.toolColors[tool];
      set({
        tool,
        selectedId: tool === "select" ? s.selectedId : null,
        color: saved ?? s.color,
      });
    },
    setColor: (color) => {
      const s = get();
      const toolColors = { ...s.toolColors, [s.tool]: color };
      const recentColors = [color, ...s.recentColors.filter((c) => c !== color)].slice(0, 12);
      savePrefs({
        toolColors,
        recentColors,
        favoriteColors: s.favoriteColors,
        autoRecognizeShape: s.autoRecognizeShape,
      });
      set({ color, toolColors, recentColors });
    },
    setToolColor: (tool, color) => {
      const s = get();
      const toolColors = { ...s.toolColors, [tool]: color };
      savePrefs({
        toolColors,
        recentColors: s.recentColors,
        favoriteColors: s.favoriteColors,
        autoRecognizeShape: s.autoRecognizeShape,
      });
      set({ toolColors, color: s.tool === tool ? color : s.color });
    },
    toggleFavoriteColor: (color) => {
      const s = get();
      const exists = s.favoriteColors.includes(color);
      const favoriteColors = exists
        ? s.favoriteColors.filter((c) => c !== color)
        : [color, ...s.favoriteColors].slice(0, 16);
      savePrefs({
        toolColors: s.toolColors,
        recentColors: s.recentColors,
        favoriteColors,
        autoRecognizeShape: s.autoRecognizeShape,
      });
      set({ favoriteColors });
    },
    setAutoRecognizeShape: (v) => {
      const s = get();
      savePrefs({
        toolColors: s.toolColors,
        recentColors: s.recentColors,
        favoriteColors: s.favoriteColors,
        autoRecognizeShape: v,
      });
      set({ autoRecognizeShape: v });
    },
    setSize: (size) => set({ size }),
    setSelected: (id) => set({ selectedId: id }),
    setCamera: (camera) => set({ camera }),

    addObject: (obj) => {
      const s = get();
      const pages = s.pages.map((p) =>
        p.id === s.activePageId ? { ...p, objects: [...p.objects, obj] } : p,
      );
      set(syncActive({ ...s, pages }));
    },
    addObjects: (objs: CanvasObject[]) => {
      const s = get();
      const pages = s.pages.map((p) =>
        p.id === s.activePageId ? { ...p, objects: [...p.objects, ...objs] } : p,
      );
      set(syncActive({ ...s, pages }));
    },
    updateObject: (id, patch) => {
      const s = get();
      const pages = s.pages.map((p) =>
        p.id === s.activePageId
          ? { ...p, objects: p.objects.map((o) => (o.id === id ? ({ ...o, ...patch } as CanvasObject) : o)) }
          : p,
      );
      set(syncActive({ ...s, pages }));
    },
    deleteObject: (id) => {
      const s = get();
      const pages = s.pages.map((p) =>
        p.id === s.activePageId ? { ...p, objects: p.objects.filter((o) => o.id !== id) } : p,
      );
      set(syncActive({ ...s, pages, selectedId: null }));
    },
    clearPage: () => {
      const s = get();
      const pages = s.pages.map((p) => (p.id === s.activePageId ? { ...p, objects: [] } : p));
      set(syncActive({ ...s, pages }));
    },
    addPage: () => {
      const s = get();
      const p = emptyPage();
      set(syncActive({ ...s, pages: [...s.pages, p], activePageId: p.id }));
    },
    removePage: (id) => {
      const s = get();
      if (s.pages.length === 1) return;
      const pages = s.pages.filter((p) => p.id !== id);
      const activePageId = s.activePageId === id ? pages[0].id : s.activePageId;
      set(syncActive({ ...s, pages, activePageId }));
    },
    setActivePage: (id) => {
      const s = get();
      set(syncActive({ ...s, activePageId: id, selectedId: null }));
    },
    nextPage: () => {
      const s = get();
      const i = s.pages.findIndex((p) => p.id === s.activePageId);
      const n = s.pages[Math.min(i + 1, s.pages.length - 1)];
      set(syncActive({ ...s, activePageId: n.id, selectedId: null }));
    },
    prevPage: () => {
      const s = get();
      const i = s.pages.findIndex((p) => p.id === s.activePageId);
      const n = s.pages[Math.max(i - 1, 0)];
      set(syncActive({ ...s, activePageId: n.id, selectedId: null }));
    },
    setBackground: (bg) => {
      const s = get();
      // Bug fix: never mutate before a board is opened; would corrupt the "temp" page
      // and could ghost into a fresh board later. No-op until openBoard has run.
      if (!s.activeBoardId || !s.boards[s.activeBoardId]) return;
      const pages = s.pages.map((p) =>
        p.id === s.activePageId ? { ...p, background: bg } : p,
      );
      set(syncActive({ ...s, pages }));
    },
    setBackgroundStyle: (style) => {
      const s = get();
      if (!s.activeBoardId || !s.boards[s.activeBoardId]) return;
      const pages = s.pages.map((p) =>
        p.id === s.activePageId ? { ...p, bgStyle: style } : p,
      );
      set(syncActive({ ...s, pages }));
    },
    setBackgroundColor: (color) => {
      const s = get();
      if (!s.activeBoardId || !s.boards[s.activeBoardId]) return;
      const pages = s.pages.map((p) =>
        p.id === s.activePageId ? { ...p, bgColor: color } : p,
      );
      set(syncActive({ ...s, pages }));
    },

    pushHistory: () => {
      const s = get();
      const snap = structuredClone(s.pages);
      const history = [...s.history.slice(0, s.historyIndex + 1), snap].slice(-50);
      set({ history, historyIndex: history.length - 1 });
    },
    undo: () => {
      const s = get();
      if (s.historyIndex <= 0) return;
      const i = s.historyIndex - 1;
      const pages = structuredClone(s.history[i]);
      set(syncActive({ ...s, pages, historyIndex: i }));
    },
    redo: () => {
      const s = get();
      if (s.historyIndex >= s.history.length - 1) return;
      const i = s.historyIndex + 1;
      const pages = structuredClone(s.history[i]);
      set(syncActive({ ...s, pages, historyIndex: i }));
    },

    createBoard: (opts) => {
      const s = get();
      const id = uid();
      const templateKey = opts?.templateKey;
      const pages = templateKey ? pagesForTemplate(templateKey) : [emptyPage()];
      const title = opts?.title ?? "Untitled board";
      const meta: BoardMeta = {
        id, title, tags: [], folderId: opts?.folderId ?? null,
        favorite: false, archived: false,
        createdAt: nowMs(), updatedAt: nowMs(),
        templateKey,
      };
      const boards = { ...s.boards, [id]: meta };
      const boardOrder = [id, ...s.boardOrder];
      const boardData = { ...s.boardData, [id]: { pages, activePageId: pages[0].id } };
      const next: State = { ...s, boards, boardOrder, boardData };
      persistMeta(next);
      set(next);
      return id;
    },
    openBoard: (id) => {
      const s = get();
      const bd = s.boardData[id];
      if (!bd) return;
      // sync outgoing
      let boardData = s.boardData;
      let boards = s.boards;
      if (s.activeBoardId && s.boards[s.activeBoardId]) {
        boardData = {
          ...boardData,
          [s.activeBoardId]: { pages: s.pages, activePageId: s.activePageId },
        };
        boards = {
          ...boards,
          [s.activeBoardId]: { ...s.boards[s.activeBoardId], updatedAt: nowMs() },
        };
      }
      const next: State = {
        ...s,
        boardData,
        boards,
        activeBoardId: id,
        pages: bd.pages,
        activePageId: bd.activePageId,
        history: [structuredClone(bd.pages)],
        historyIndex: 0,
        selectedId: null,
        camera: { x: 0, y: 0, zoom: 1 },
      };
      persistMeta(next);
      set(next);
    },
    renameBoard: (id, title) => {
      const s = get();
      if (!s.boards[id]) return;
      const boards = { ...s.boards, [id]: { ...s.boards[id], title, updatedAt: nowMs() } };
      const next = { ...s, boards };
      persistMeta(next);
      set(next);
    },
    deleteBoard: (id) => {
      const s = get();
      const { [id]: _m, ...boards } = s.boards;
      const { [id]: _d, ...boardData } = s.boardData;
      const boardOrder = s.boardOrder.filter((b) => b !== id);
      const activeBoardId = s.activeBoardId === id ? null : s.activeBoardId;
      const next: State = { ...s, boards, boardData, boardOrder, activeBoardId };
      persistMeta(next);
      set(next);
    },
    duplicateBoard: (id) => {
      const s = get();
      const src = s.boards[id];
      const data = s.boardData[id];
      if (!src || !data) return "";
      const newId = uid();
      const meta: BoardMeta = {
        ...src,
        id: newId,
        title: `${src.title} (copy)`,
        favorite: false,
        archived: false,
        createdAt: nowMs(),
        updatedAt: nowMs(),
      };
      const clone = structuredClone(data);
      const boards = { ...s.boards, [newId]: meta };
      const boardOrder = [newId, ...s.boardOrder];
      const boardData = { ...s.boardData, [newId]: clone };
      const next = { ...s, boards, boardOrder, boardData };
      persistMeta(next);
      set(next);
      return newId;
    },
    toggleFavorite: (id) => {
      const s = get();
      if (!s.boards[id]) return;
      const boards = { ...s.boards, [id]: { ...s.boards[id], favorite: !s.boards[id].favorite } };
      const next = { ...s, boards };
      persistMeta(next);
      set(next);
    },
    toggleArchive: (id) => {
      const s = get();
      if (!s.boards[id]) return;
      const boards = { ...s.boards, [id]: { ...s.boards[id], archived: !s.boards[id].archived } };
      const next = { ...s, boards };
      persistMeta(next);
      set(next);
    },
    setBoardTags: (id, tags) => {
      const s = get();
      if (!s.boards[id]) return;
      const boards = { ...s.boards, [id]: { ...s.boards[id], tags } };
      const next = { ...s, boards };
      persistMeta(next);
      set(next);
    },
    setBoardFolder: (id, folderId) => {
      const s = get();
      if (!s.boards[id]) return;
      const boards = { ...s.boards, [id]: { ...s.boards[id], folderId } };
      const next = { ...s, boards };
      persistMeta(next);
      set(next);
    },
    setBoardThumbnail: (id, dataUrl) => {
      const s = get();
      if (!s.boards[id]) return;
      if (s.boards[id].thumbnail === dataUrl) return;
      const boards = { ...s.boards, [id]: { ...s.boards[id], thumbnail: dataUrl } };
      const next = { ...s, boards };
      persistMeta(next);
      set(next);
    },


    createFolder: (name) => {
      const s = get();
      const id = uid();
      const folders = [...s.folders, { id, name }];
      const next = { ...s, folders };
      persistMeta(next);
      set(next);
      return id;
    },
    renameFolder: (id, name) => {
      const s = get();
      const folders = s.folders.map((f) => (f.id === id ? { ...f, name } : f));
      const next = { ...s, folders };
      persistMeta(next);
      set(next);
    },
    deleteFolder: (id) => {
      const s = get();
      const folders = s.folders.filter((f) => f.id !== id);
      const boards: Record<string, BoardMeta> = {};
      for (const [bid, b] of Object.entries(s.boards)) {
        boards[bid] = b.folderId === id ? { ...b, folderId: null } : b;
      }
      const next = { ...s, folders, boards };
      persistMeta(next);
      set(next);
    },

    addRecentAI: (item) => {
      const s = get();
      const entry: RecentAI = { id: uid(), createdAt: nowMs(), ...item };
      const recentAI = [entry, ...s.recentAI].slice(0, 20);
      const next = { ...s, recentAI };
      persistMeta(next);
      set(next);
    },
    clearRecentAI: () => {
      const s = get();
      const next = { ...s, recentAI: [] };
      persistMeta(next);
      set(next);
    },
  };
});
