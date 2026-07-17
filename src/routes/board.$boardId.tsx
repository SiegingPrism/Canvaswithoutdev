import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { WhiteboardCanvas } from "@/components/whiteboard/Canvas";
import { Toolbar } from "@/components/whiteboard/Toolbar";
import { TopBar } from "@/components/whiteboard/TopBar";
import { WidgetsSheet, useWidgetLauncher } from "@/components/whiteboard/WidgetsSheet";
import { AISheet } from "@/components/whiteboard/AISheet";
import { FloatingWidget } from "@/components/whiteboard/FloatingWidget";
import { ContextToolbar, ZoomControls } from "@/components/whiteboard/ContextToolbar";
import { CircleSearch } from "@/components/whiteboard/CircleSearch";
import { CloudFilesSheet } from "@/components/whiteboard/CloudFilesSheet";
import { getWidget } from "@/lib/registry/widgetRegistry";
import "@/lib/registry/featureRegistry"; // side-effect: load feature modules
import { useWhiteboard } from "@/lib/whiteboard/store";
import { objectText, pageText } from "@/lib/whiteboard/pageText";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export const Route = createFileRoute("/board/$boardId")({
  head: () => ({
    meta: [{ title: "Board — Slate" }, { name: "robots", content: "noindex" }],
  }),
  component: BoardPage,
  errorComponent: ({ error }) => (
    <div className="grid min-h-dvh place-items-center bg-background p-6 text-center">
      <div>
        <h1 className="text-lg font-semibold">Couldn't open this board</h1>
        <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
        <a href="/" className="mt-4 inline-block text-sm text-primary underline">
          Back to dashboard
        </a>
      </div>
    </div>
  ),
});

function BoardPage() {
  const { boardId } = Route.useParams();
  const navigate = useNavigate();
  const [widgetsOpen, setWidgetsOpen] = useState(false);
  const [aiOpen, setAIOpen] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const [circleActive, setCircleActive] = useState(false);
  const [cloudOpen, setCloudOpen] = useState(false);
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
    setTool,
    setSelected,
    nextPage,
    prevPage,
  } = useWhiteboard();

  // Presentation mode (PRD Doc 16): fullscreen, laser pointer, page navigation.
  function enterPresentation() {
    setSelected(null);
    setTool("laser");
    setPresenting(true);
    document.documentElement.requestFullscreen?.().catch(() => {});
  }
  function exitPresentation() {
    setPresenting(false);
    setTool("select");
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  }

  useEffect(() => {
    if (!presenting) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") exitPresentation();
      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") nextPage();
      if (e.key === "ArrowLeft" || e.key === "PageUp") prevPage();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presenting]);

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
  const contextText = selected ? objectText(selected) || undefined : undefined;
  const boardContext = pageText(page) || undefined;

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

      {!presenting && (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center p-2 sm:p-3 pt-[max(8px,env(safe-area-inset-top))]">
            <TopBar
              onOpenAI={() => setAIOpen(true)}
              onOpenWidgets={() => setWidgetsOpen(true)}
              onPresent={enterPresentation}
              onOpenCloud={() => setCloudOpen(true)}
              boardTitle={board?.title ?? "Untitled board"}
            />
          </div>

          <div className="pointer-events-none absolute left-2 top-1/2 hidden -translate-y-1/2 lg:block">
            <Toolbar />
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center lg:hidden">
            <Toolbar />
          </div>

          {selected && (
            <div className="pointer-events-none absolute bottom-24 left-1/2 -translate-x-1/2 lg:bottom-4 lg:left-auto lg:right-4 lg:translate-x-0">
              <ContextToolbar selected={selected} onOpenAI={() => setAIOpen(true)} />
            </div>
          )}

          <div className="pointer-events-none absolute bottom-2 left-2 hidden lg:block">
            <ZoomControls />
          </div>
        </>
      )}

      {presenting && (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
          <div className="pointer-events-auto flex items-center gap-1 rounded-full bg-card/95 px-2 py-1.5 shadow-lg ring-1 ring-border backdrop-blur">
            <button
              className="grid h-9 w-9 place-items-center rounded-full hover:bg-accent"
              onClick={prevPage}
              title="Previous page (←)"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="min-w-14 text-center text-sm font-medium tabular-nums">
              {pages.findIndex((p) => p.id === activePageId) + 1} / {pages.length}
            </span>
            <button
              className="grid h-9 w-9 place-items-center rounded-full hover:bg-accent"
              onClick={nextPage}
              title="Next page (→)"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="mx-1 h-5 w-px bg-border" />
            <span className="px-1 text-xs text-muted-foreground">
              Laser is live — draw to point
            </span>
            <button
              className="grid h-9 w-9 place-items-center rounded-full hover:bg-accent"
              onClick={exitPresentation}
              title="Exit presentation (Esc)"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      <CircleSearch active={circleActive} onExit={() => setCircleActive(false)} />

      <WidgetsSheet open={widgetsOpen} onOpenChange={setWidgetsOpen} onLaunch={launch} />
      <CloudFilesSheet open={cloudOpen} onOpenChange={setCloudOpen} />
      <AISheet
        open={aiOpen}
        onOpenChange={setAIOpen}
        contextText={contextText}
        pageContext={boardContext}
        boardId={boardId}
        onCircleSearch={() => {
          setAIOpen(false);
          setCircleActive(true);
        }}
      />

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
