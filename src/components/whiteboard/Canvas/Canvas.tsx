import { useEffect, useRef, useState } from "react";
import { useWhiteboard } from "@/lib/whiteboard/store";
import type { CanvasObject, Point, TextObject } from "@/lib/whiteboard/types";
import "./renderer"; // side-effect: registers built-in object kinds
import { drawObject, objectBounds } from "./renderer";
import { drawBackground } from "./background";
import { drawSelection, getHandleAt, hitTest, type Handle } from "./selection";
import { toWorld, wheelZoom } from "./camera";
import { animateLaserFade, drawLive, finalizeStroke } from "./drawing";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function WhiteboardCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const {
    pages,
    activePageId,
    tool,
    color,
    size,
    camera,
    selectedId,
    addObject,
    updateObject,
    deleteObject,
    setSelected,
    setCamera,
    pushHistory,
    autoRecognizeShape,
  } = useWhiteboard();


  const page = pages.find((p) => p.id === activePageId)!;
  const [dpr, setDpr] = useState(1);
  const drawingRef = useRef<{ points: Point[]; color: string; startedAt: number } | null>(null);
  const laserRef = useRef<Point[]>([]);
  const panRef = useRef<{ x: number; y: number; cam: typeof camera } | null>(null);
  const dragRef = useRef<{
    id: string;
    handle: Handle;
    start: Point;
    obj: CanvasObject;
  } | null>(null);
  const [editingText, setEditingText] = useState<{ id: string } | null>(null);
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());

  useEffect(() => {
    setDpr(window.devicePixelRatio || 1);
    const onResize = () => setDpr(window.devicePixelRatio || 1);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const wrap = wrapRef.current;
    const c = canvasRef.current;
    const o = overlayRef.current;
    if (!wrap || !c || !o) return;
    const ro = new ResizeObserver(() => {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      for (const cv of [c, o]) {
        cv.width = w * dpr;
        cv.height = h * dpr;
        cv.style.width = `${w}px`;
        cv.style.height = `${h}px`;
      }
      redraw();
    });
    ro.observe(wrap);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dpr]);

  useEffect(() => {
    redraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, camera, selectedId, dpr]);

  function redraw() {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.scale(dpr, dpr);
    drawBackground(ctx, c.width / dpr, c.height / dpr, page, camera);
    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.zoom, camera.zoom);
    const rc = { ctx, requestRedraw: redraw, imageCache: imageCache.current };
    for (const obj of page.objects) drawObject(obj, rc);
    ctx.restore();
    const sel = page.objects.find((o) => o.id === selectedId);
    if (sel) drawSelection(ctx, sel, camera);
  }

  // ---- Pointer events ----
  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const rect = canvasRef.current!.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const w = toWorld(camera, sx, sy);

    if (e.button === 1 || tool === "pan") {
      panRef.current = { x: sx, y: sy, cam: { ...camera } };
      return;
    }

    if (tool === "select") {
      const hit = hitTest(page.objects, w);
      if (hit) {
        const handle: Handle =
          selectedId === hit.id ? getHandleAt(w, hit, camera.zoom) : { type: "move" };
        setSelected(hit.id);
        dragRef.current = { id: hit.id, handle, start: w, obj: structuredClone(hit) };
      } else {
        setSelected(null);
      }
      return;
    }

    if (tool === "eraser-object") {
      const hit = hitTest(page.objects, w);
      if (hit) {
        pushHistory();
        deleteObject(hit.id);
      }
      return;
    }

    if (tool === "text") {
      const t: TextObject = {
        id: uid(),
        kind: "text",
        x: w.x,
        y: w.y,
        w: 240,
        h: 60,
        text: "",
        color,
        fontSize: 20,
      };
      addObject(t);
      setSelected(t.id);
      setEditingText({ id: t.id });
      return;
    }

    drawingRef.current = { points: [w], color, startedAt: Date.now() };
    if (tool === "laser") laserRef.current = [w];
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const w = toWorld(camera, sx, sy);

    if (panRef.current) {
      setCamera({
        x: panRef.current.cam.x + (sx - panRef.current.x),
        y: panRef.current.cam.y + (sy - panRef.current.y),
        zoom: camera.zoom,
      });
      return;
    }

    if (dragRef.current) {
      const d = dragRef.current;
      const dx = w.x - d.start.x;
      const dy = w.y - d.start.y;
      const orig = d.obj;
      if (d.handle.type === "move") {
        if ("points" in orig) {
          updateObject(d.id, {
            points: orig.points.map((p) => ({ ...p, x: p.x + dx, y: p.y + dy })),
          } as Partial<CanvasObject>);
        } else {
          updateObject(d.id, { x: orig.x + dx, y: orig.y + dy } as Partial<CanvasObject>);
        }
      } else {
        if (!("points" in orig)) {
          let nx = orig.x, ny = orig.y, nw = orig.w, nh = orig.h;
          if (d.handle.corner === "se") { nw = orig.w + dx; nh = orig.h + dy; }
          if (d.handle.corner === "ne") { ny = orig.y + dy; nw = orig.w + dx; nh = orig.h - dy; }
          if (d.handle.corner === "sw") { nx = orig.x + dx; nw = orig.w - dx; nh = orig.h + dy; }
          if (d.handle.corner === "nw") { nx = orig.x + dx; ny = orig.y + dy; nw = orig.w - dx; nh = orig.h - dy; }
          updateObject(d.id, {
            x: nx, y: ny, w: Math.max(20, nw), h: Math.max(20, nh),
          } as Partial<CanvasObject>);
        }
      }
      return;
    }

    if (drawingRef.current) {
      drawingRef.current.points.push(w);
      if (tool === "eraser-pixel") {
        const eraseR = size * 4;
        for (const obj of page.objects) {
          if ("points" in obj) {
            const hit = obj.points.some((p) => Math.hypot(p.x - w.x, p.y - w.y) < eraseR);
            if (hit) deleteObject(obj.id);
          } else {
            const b = objectBounds(obj);
            if (w.x >= b.x && w.x <= b.x + b.w && w.y >= b.y && w.y <= b.y + b.h) {
              // pixel eraser only removes strokes; leave shape objects intact
            }
          }
        }
      } else if (tool === "laser") {
        laserRef.current.push(w);
        const maxAge = 800;
        const drop = laserRef.current.length - Math.min(laserRef.current.length, Math.floor(maxAge / 8));
        if (drop > 0) laserRef.current.splice(0, drop);
      }
      drawLive(overlayRef.current!, dpr, camera, tool, color, size, drawingRef.current.points);
    }
  }

  function onPointerUp() {
    panRef.current = null;
    if (dragRef.current) {
      pushHistory();
      dragRef.current = null;
      return;
    }
    if (drawingRef.current) {
      const d = drawingRef.current;
      drawingRef.current = null;
      const overlay = overlayRef.current!;
      overlay.getContext("2d")!.clearRect(0, 0, overlay.width, overlay.height);

      if (tool === "eraser-pixel" || tool === "eraser-object") {
        pushHistory();
        return;
      }
      if (tool === "laser") {
        animateLaserFade(overlay, dpr, camera, laserRef.current);
        return;
      }
      const obj = finalizeStroke(tool, color, size, d.points, autoRecognizeShape);
      if (obj) {
        addObject(obj);
        pushHistory();
      }
    }
  }

  function onWheel(e: React.WheelEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    setCamera(wheelZoom(camera, e, rect));
  }

  function onDoubleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    const w = toWorld(camera, e.clientX - rect.left, e.clientY - rect.top);
    const hit = hitTest(page.objects, w);
    if (!hit) return;
    if (hit.kind === "flashcard") {
      updateObject(hit.id, { flipped: !hit.flipped } as Partial<CanvasObject>);
      pushHistory();
    } else if (hit.kind === "quiz") {
      updateObject(hit.id, { revealed: !hit.revealed } as Partial<CanvasObject>);
      pushHistory();
    } else if (hit.kind === "roadmap") {
      const next = hit.status === "todo" ? "doing" : hit.status === "doing" ? "done" : "todo";
      updateObject(hit.id, { status: next } as Partial<CanvasObject>);
      pushHistory();
    } else if (hit.kind === "text" || hit.kind === "sticky") {
      setSelected(hit.id);
      if (hit.kind === "text") setEditingText({ id: hit.id });
    }
  }

  const editing = editingText
    ? (page.objects.find((o) => o.id === editingText.id) as TextObject | undefined)
    : undefined;

  return (
    <div ref={wrapRef} className="relative h-full w-full overflow-hidden touch-none select-none">
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={onDoubleClick}
        onWheel={onWheel}
        style={{ cursor: tool === "pan" ? "grab" : tool === "select" ? "default" : "crosshair" }}
      />
      <canvas ref={overlayRef} className="absolute inset-0 pointer-events-none" />
      {editing && (
        <textarea
          autoFocus
          className="absolute rounded border-2 border-primary bg-white/95 px-1 py-0.5 text-slate-900 outline-none resize-none shadow-lg"
          style={{
            left: editing.x * camera.zoom + camera.x,
            top: editing.y * camera.zoom + camera.y,
            width: editing.w * camera.zoom,
            minHeight: editing.h * camera.zoom,
            fontSize: editing.fontSize * camera.zoom,
          }}
          defaultValue={editing.text}
          onBlur={(e) => {
            updateObject(editing.id, { text: e.target.value } as Partial<CanvasObject>);
            setEditingText(null);
            pushHistory();
          }}
        />
      )}
    </div>
  );
}
