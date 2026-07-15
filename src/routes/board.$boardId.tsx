import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { WhiteboardCanvas } from "@/components/whiteboard/Canvas";
import { Toolbar } from "@/components/whiteboard/Toolbar";
import { TopBar } from "@/components/whiteboard/TopBar";
import { WidgetsSheet, useWidgetLauncher } from "@/components/whiteboard/WidgetsSheet";
import { AISheet } from "@/components/whiteboard/AISheet";
import { FloatingWidget } from "@/components/whiteboard/FloatingWidget";
import { getWidget } from "@/lib/registry/widgetRegistry";
import "@/lib/registry/featureRegistry"; // side-effect: load feature modules
import { useWhiteboard } from "@/lib/whiteboard/store";
import { Wand2 } from "lucide-react";


export const Route = createFileRoute("/board/$boardId")({
  head: () => ({
    meta: [
      { title: "Board — Slate" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BoardPage,
  errorComponent: ({ error }) => (
    <div className="grid min-h-dvh place-items-center bg-background p-6 text-center">
      <div>
        <h1 className="text-lg font-semibold">Couldn't open this board</h1>
        <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
        <a href="/" className="mt-4 inline-block text-sm text-primary underline">Back to dashboard</a>
      </div>
    </div>
  ),
});

function BoardPage() {
  const { boardId } = Route.useParams();
  const navigate = useNavigate();
  const [widgetsOpen, setWidgetsOpen] = useState(false);
  const [aiOpen, setAIOpen] = useState(false);
  const { openWidgets, launch, close } = useWidgetLauncher();
  const {
    selectedId,
    pages,
    activePageId,
    activeBoardId,
    boards,
    boardData,
    openBoard,
    setBoardThumbnail,
  } = useWhiteboard();

  useEffect(() => {
    if (!boardData[boardId]) {
      navigate({ to: "/", replace: true });
      return;
    }
    if (activeBoardId !== boardId) openBoard(boardId);
  }, [boardId, boardData, activeBoardId, openBoard, navigate]);

  // Debounced thumbnail regeneration when pages change
  useEffect(() => {
    if (activeBoardId !== boardId) return;
    const t = window.setTimeout(async () => {
      const { generatePageThumbnail } = await import("@/lib/whiteboard/thumbnail");
      const first = pages[0];
      if (!first) return;
      const url = generatePageThumbnail(first);
      if (url) setBoardThumbnail(boardId, url);
    }, 1200);
    return () => window.clearTimeout(t);
  }, [pages, boardId, activeBoardId, setBoardThumbnail]);


  const board = boards[boardId];
  const ready = activeBoardId === boardId && pages.length > 0;
  const page = ready ? pages.find((p) => p.id === activePageId) : undefined;
  const selected = page?.objects.find((o) => o.id === selectedId);
  const contextText =
    selected && "text" in selected && typeof selected.text === "string" ? selected.text : undefined;

  if (!ready) {
    return (
      <div className="grid h-dvh w-screen place-items-center bg-background text-sm text-muted-foreground">
        Loading board…
      </div>
    );
  }

  return (
    <div className="relative h-dvh w-screen overflow-hidden bg-background">
      <WhiteboardCanvas />

      <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center p-2 sm:p-3">
        <TopBar
          onOpenAI={() => setAIOpen(true)}
          onOpenWidgets={() => setWidgetsOpen(true)}
          boardTitle={board?.title ?? "Untitled board"}
        />
      </div>

      <div className="pointer-events-none absolute left-2 top-1/2 hidden -translate-y-1/2 lg:block">
        <Toolbar />
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center lg:hidden">
        <Toolbar />
      </div>

      {selectedId && (
        <div className="pointer-events-none absolute bottom-24 left-1/2 -translate-x-1/2 lg:bottom-4 lg:left-auto lg:right-4 lg:translate-x-0">
          <div className="pointer-events-auto flex items-center gap-1 rounded-full bg-card px-2 py-1 shadow-lg ring-1 ring-border">
            <button
              onClick={() => setAIOpen(true)}
              className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Wand2 className="h-3.5 w-3.5" />
              Ask AI
            </button>
          </div>
        </div>
      )}

      <WidgetsSheet open={widgetsOpen} onOpenChange={setWidgetsOpen} onLaunch={launch} />
      <AISheet open={aiOpen} onOpenChange={setAIOpen} contextText={contextText} boardId={boardId} />

      {openWidgets.map((w) => {
        const def = getWidget(w.kind);
        if (!def) return null;
        const Component = def.component;
        return (
          <FloatingWidget
            key={w.id}
            title={def.label}
            initial={{ x: w.x, y: w.y }}
            onClose={() => close(w.id)}
          >
            <Component />
          </FloatingWidget>
        );
      })}
    </div>
  );
}

