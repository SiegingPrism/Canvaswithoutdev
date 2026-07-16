import { useWhiteboard } from "@/lib/whiteboard/store";
import type { CanvasObject } from "@/lib/whiteboard/types";
import { objectBounds } from "@/components/whiteboard/Canvas/renderer";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Wand2,
  Copy,
  Trash2,
  BringToFront,
  SendToBack,
  ArrowUp,
  ArrowDown,
  Palette,
  Plus,
  Minus,
  Maximize,
  RotateCcw,
} from "lucide-react";

const SWATCHES = [
  "#111827",
  "#ef4444",
  "#f97316",
  "#facc15",
  "#22c55e",
  "#0ea5e9",
  "#6366f1",
  "#a855f7",
  "#ec4899",
  "#ffffff",
];

/**
 * Context toolbar (PRD Doc 3 §10): shows only the actions relevant to the
 * currently selected object — color/fill, layer order, duplicate, delete, AI.
 */
export function ContextToolbar({
  selected,
  onOpenAI,
}: {
  selected: CanvasObject;
  onOpenAI: () => void;
}) {
  const updateObject = useWhiteboard((s) => s.updateObject);
  const deleteObject = useWhiteboard((s) => s.deleteObject);
  const duplicateObject = useWhiteboard((s) => s.duplicateObject);
  const reorderObject = useWhiteboard((s) => s.reorderObject);
  const pushHistory = useWhiteboard((s) => s.pushHistory);

  const hasColor = "color" in selected;
  const isShape = selected.kind === "shape";
  const isText = selected.kind === "text";

  const btn =
    "grid h-8 w-8 place-items-center rounded-full text-foreground hover:bg-accent transition";

  function commit(patch: Partial<CanvasObject>) {
    updateObject(selected.id, patch);
    pushHistory();
  }

  return (
    <div className="pointer-events-auto flex items-center gap-0.5 rounded-full bg-card px-1.5 py-1 shadow-lg ring-1 ring-border backdrop-blur">
      {hasColor && (
        <Popover>
          <PopoverTrigger asChild>
            <button className={btn} title="Color">
              <Palette className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56 space-y-3 p-3" align="center" side="top">
            <div>
              <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {isShape ? "Stroke" : "Color"}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SWATCHES.map((c) => (
                  <button
                    key={c}
                    onClick={() => commit({ color: c } as Partial<CanvasObject>)}
                    className={`h-6 w-6 rounded-full ring-2 transition ${
                      (selected as { color?: string }).color === c ? "ring-primary" : "ring-border"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            {isShape && (
              <div>
                <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Fill
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => commit({ fill: undefined } as Partial<CanvasObject>)}
                    className="grid h-6 w-6 place-items-center rounded-full text-[10px] ring-2 ring-border"
                    title="No fill"
                  >
                    ∅
                  </button>
                  {SWATCHES.map((c) => (
                    <button
                      key={c}
                      onClick={() => commit({ fill: c } as Partial<CanvasObject>)}
                      className={`h-6 w-6 rounded-full ring-2 transition ${
                        (selected as { fill?: string }).fill === c ? "ring-primary" : "ring-border"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            )}
          </PopoverContent>
        </Popover>
      )}

      {isText && (
        <>
          <button
            className={btn}
            title="Smaller text"
            onClick={() =>
              commit({
                fontSize: Math.max(10, (selected as { fontSize: number }).fontSize - 2),
              } as Partial<CanvasObject>)
            }
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            className={btn}
            title="Larger text"
            onClick={() =>
              commit({
                fontSize: Math.min(96, (selected as { fontSize: number }).fontSize + 2),
              } as Partial<CanvasObject>)
            }
          >
            <Plus className="h-4 w-4" />
          </button>
        </>
      )}

      <div className="mx-0.5 h-5 w-px bg-border" />

      <button
        className={btn}
        title="Bring to front"
        onClick={() => {
          reorderObject(selected.id, "front");
          pushHistory();
        }}
      >
        <BringToFront className="h-4 w-4" />
      </button>
      <button
        className={btn}
        title="Bring forward"
        onClick={() => {
          reorderObject(selected.id, "forward");
          pushHistory();
        }}
      >
        <ArrowUp className="h-4 w-4" />
      </button>
      <button
        className={btn}
        title="Send backward"
        onClick={() => {
          reorderObject(selected.id, "backward");
          pushHistory();
        }}
      >
        <ArrowDown className="h-4 w-4" />
      </button>
      <button
        className={btn}
        title="Send to back"
        onClick={() => {
          reorderObject(selected.id, "back");
          pushHistory();
        }}
      >
        <SendToBack className="h-4 w-4" />
      </button>

      <div className="mx-0.5 h-5 w-px bg-border" />

      <button
        className={btn}
        title="Duplicate (⌘D)"
        onClick={() => {
          duplicateObject(selected.id);
          pushHistory();
        }}
      >
        <Copy className="h-4 w-4" />
      </button>
      <button
        className={`${btn} text-destructive`}
        title="Delete"
        onClick={() => {
          pushHistory();
          deleteObject(selected.id);
        }}
      >
        <Trash2 className="h-4 w-4" />
      </button>

      <div className="mx-0.5 h-5 w-px bg-border" />

      <button
        onClick={onOpenAI}
        className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary/90"
      >
        <Wand2 className="h-3.5 w-3.5" />
        Ask AI
      </button>
    </div>
  );
}

/**
 * Zoom controls (PRD Doc 3 §5): zoom in/out, fit all objects, reset view.
 */
export function ZoomControls() {
  const camera = useWhiteboard((s) => s.camera);
  const setCamera = useWhiteboard((s) => s.setCamera);
  const pages = useWhiteboard((s) => s.pages);
  const activePageId = useWhiteboard((s) => s.activePageId);

  const btn =
    "grid h-8 w-8 place-items-center rounded-lg text-foreground hover:bg-accent transition";

  function zoomBy(factor: number) {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const newZoom = Math.min(8, Math.max(0.1, camera.zoom * factor));
    const wx = (cx - camera.x) / camera.zoom;
    const wy = (cy - camera.y) / camera.zoom;
    setCamera({ x: cx - wx * newZoom, y: cy - wy * newZoom, zoom: newZoom });
  }

  function fitAll() {
    const page = pages.find((p) => p.id === activePageId);
    if (!page || page.objects.length === 0) {
      setCamera({ x: 0, y: 0, zoom: 1 });
      return;
    }
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const o of page.objects) {
      const b = objectBounds(o);
      minX = Math.min(minX, b.x, b.x + b.w);
      minY = Math.min(minY, b.y, b.y + b.h);
      maxX = Math.max(maxX, b.x, b.x + b.w);
      maxY = Math.max(maxY, b.y, b.y + b.h);
    }
    const pad = 60;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = Math.max(1, maxX - minX);
    const h = Math.max(1, maxY - minY);
    const zoom = Math.min(8, Math.max(0.1, Math.min((vw - pad * 2) / w, (vh - pad * 2) / h)));
    setCamera({
      x: vw / 2 - (minX + w / 2) * zoom,
      y: vh / 2 - (minY + h / 2) * zoom,
      zoom,
    });
  }

  return (
    <div className="pointer-events-auto flex items-center gap-0.5 rounded-xl bg-card/95 p-1 shadow-lg ring-1 ring-border backdrop-blur">
      <button className={btn} title="Zoom out" onClick={() => zoomBy(1 / 1.2)}>
        <Minus className="h-4 w-4" />
      </button>
      <button
        className="min-w-12 rounded px-1 text-center text-xs font-medium tabular-nums hover:bg-accent"
        title="Reset zoom (⌘0)"
        onClick={() => setCamera({ x: 0, y: 0, zoom: 1 })}
      >
        {Math.round(camera.zoom * 100)}%
      </button>
      <button className={btn} title="Zoom in" onClick={() => zoomBy(1.2)}>
        <Plus className="h-4 w-4" />
      </button>
      <button className={btn} title="Fit all objects" onClick={fitAll}>
        <Maximize className="h-4 w-4" />
      </button>
      <button className={btn} title="Reset view" onClick={() => setCamera({ x: 0, y: 0, zoom: 1 })}>
        <RotateCcw className="h-4 w-4" />
      </button>
    </div>
  );
}
