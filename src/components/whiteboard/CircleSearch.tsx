import { useRef, useState } from "react";
import { circleSearch } from "@/lib/ai/circleSearch.functions";
import { useWhiteboard } from "@/lib/whiteboard/store";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, ScanSearch, StickyNote, X } from "lucide-react";

type Rect = { x: number; y: number; w: number; h: number };

/**
 * Circle & search: drag to select a region of the whiteboard; the region is
 * cropped from the rendered canvas and sent to the AI vision model.
 */
export function CircleSearch({ active, onExit }: { active: boolean; onExit: () => void }) {
  const addObject = useWhiteboard((s) => s.addObject);
  const pushHistory = useWhiteboard((s) => s.pushHistory);
  const camera = useWhiteboard((s) => s.camera);

  const [drag, setDrag] = useState<{ sx: number; sy: number; rect: Rect } | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ image: string; answer: string } | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  function pointerRect(e: React.PointerEvent, sx: number, sy: number): Rect {
    const b = overlayRef.current!.getBoundingClientRect();
    const cx = e.clientX - b.left;
    const cy = e.clientY - b.top;
    return {
      x: Math.min(sx, cx),
      y: Math.min(sy, cy),
      w: Math.abs(cx - sx),
      h: Math.abs(cy - sy),
    };
  }

  function onDown(e: React.PointerEvent) {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const b = overlayRef.current!.getBoundingClientRect();
    const sx = e.clientX - b.left;
    const sy = e.clientY - b.top;
    setDrag({ sx, sy, rect: { x: sx, y: sy, w: 0, h: 0 } });
  }

  function onMove(e: React.PointerEvent) {
    if (!drag) return;
    setDrag({ ...drag, rect: pointerRect(e, drag.sx, drag.sy) });
  }

  async function onUp() {
    if (!drag) return;
    const rect = drag.rect;
    setDrag(null);
    if (rect.w < 12 || rect.h < 12) return; // ignore accidental clicks

    const base = document.querySelector<HTMLCanvasElement>("canvas");
    if (!base) return;
    const dpr = base.width / base.getBoundingClientRect().width || 1;

    // Crop the rendered canvas region (screen space → canvas pixels).
    const crop = document.createElement("canvas");
    const maxSide = 1280;
    const scale = Math.min(1, maxSide / Math.max(rect.w * dpr, rect.h * dpr));
    crop.width = Math.max(1, Math.round(rect.w * dpr * scale));
    crop.height = Math.max(1, Math.round(rect.h * dpr * scale));
    const ctx = crop.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, crop.width, crop.height);
    ctx.drawImage(
      base,
      rect.x * dpr,
      rect.y * dpr,
      rect.w * dpr,
      rect.h * dpr,
      0,
      0,
      crop.width,
      crop.height,
    );
    const image = crop.toDataURL("image/png");

    setBusy(true);
    try {
      const res = await circleSearch({ data: { image } });
      setResult({ image, answer: res.answer });
    } catch (err) {
      console.error(err);
      toast.error("Circle & search failed");
      onExit();
    } finally {
      setBusy(false);
    }
  }

  function addAsSticky() {
    if (!result) return;
    const cx = (window.innerWidth / 2 - camera.x) / camera.zoom;
    const cy = (window.innerHeight / 2 - camera.y) / camera.zoom;
    addObject({
      id: Math.random().toString(36).slice(2, 10),
      kind: "sticky",
      x: cx - 140,
      y: cy - 90,
      w: 280,
      h: 180,
      text: result.answer.slice(0, 600),
      color: "#e0f2fe",
    });
    pushHistory();
    toast.success("Added to board");
    closeAll();
  }

  function closeAll() {
    setResult(null);
    onExit();
  }

  if (!active) return null;

  return (
    <>
      {/* Selection overlay */}
      {!result && (
        <div
          ref={overlayRef}
          className="absolute inset-0 z-40 cursor-crosshair touch-none select-none bg-black/10"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
        >
          {drag && (
            <div
              className="absolute rounded-md border-2 border-dashed border-primary bg-primary/10"
              style={{
                left: drag.rect.x,
                top: drag.rect.y,
                width: drag.rect.w,
                height: drag.rect.h,
              }}
            />
          )}
          <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center">
            <div className="flex items-center gap-2 rounded-full bg-card px-4 py-2 text-sm shadow-lg ring-1 ring-border">
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-primary" /> Analyzing selection…
                </>
              ) : (
                <>
                  <ScanSearch className="h-4 w-4 text-primary" />
                  Drag to circle what you want explained
                  <button
                    className="pointer-events-auto ml-1 grid h-6 w-6 place-items-center rounded-full hover:bg-accent"
                    onClick={onExit}
                    title="Cancel"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Result */}
      <Dialog open={!!result} onOpenChange={(v) => !v && closeAll()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScanSearch className="h-4 w-4 text-primary" /> Circle & search
            </DialogTitle>
          </DialogHeader>
          {result && (
            <div className="space-y-3">
              <img
                src={result.image}
                alt="Circled region"
                className="max-h-40 w-full rounded-lg border object-contain"
              />
              <div className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg border bg-muted/30 p-3 text-sm">
                {result.answer}
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="flex-1" onClick={addAsSticky}>
                  <StickyNote className="h-4 w-4" /> Add answer to board
                </Button>
                <Button size="sm" variant="outline" onClick={closeAll}>
                  Done
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
