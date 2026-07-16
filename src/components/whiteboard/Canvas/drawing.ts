import type { CanvasObject, Point, ToolId } from "@/lib/whiteboard/types";
import { recognizeShape } from "@/lib/whiteboard/shapeRecognition";
import { drawRainbow, drawStroke } from "./shapes";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

/** Live preview stroke drawn on the overlay canvas. */
export function drawLive(
  overlay: HTMLCanvasElement,
  dpr: number,
  camera: { x: number; y: number; zoom: number },
  tool: ToolId,
  color: string,
  size: number,
  points: Point[],
) {
  const ctx = overlay.getContext("2d")!;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, overlay.width, overlay.height);
  ctx.scale(dpr, dpr);
  ctx.save();
  ctx.translate(camera.x, camera.y);
  ctx.scale(camera.zoom, camera.zoom);
  if (points.length < 2) {
    ctx.restore();
    return;
  }
  if (tool === "highlighter") {
    ctx.globalAlpha = 0.35;
    drawStroke(ctx, { id: "", color, size, points }, color, size * 4, 1);
  } else if (tool === "rainbow") {
    drawRainbow(ctx, { id: "", color, size, points });
  } else if (tool === "dashed") {
    ctx.setLineDash([size * 3, size * 3]);
    drawStroke(ctx, { id: "", color, size, points }, color, size, 1);
  } else if (tool === "laser") {
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (const p of points) ctx.lineTo(p.x, p.y);
    ctx.stroke();
  } else if (tool === "eraser-pixel") {
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = size * 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (const p of points) ctx.lineTo(p.x, p.y);
    ctx.stroke();
  } else {
    drawStroke(ctx, { id: "", color, size, points }, color, size, 1);
  }
  ctx.restore();
}

/** Build the stroke object to commit when the user lifts the pointer. */
export function finalizeStroke(
  tool: ToolId,
  color: string,
  size: number,
  points: Point[],
  autoRecognize = true,
): CanvasObject | null {
  if (points.length < 2) return null;
  const id = uid();
  if (tool === "shape") {
    if (autoRecognize) {
      const rec = recognizeShape(points, color, size);
      if (rec) return { id, ...rec };
    }
    return { id, kind: "pen", color, size, points };
  }
  if (tool === "pen") return { id, kind: "pen", color, size, points };
  if (tool === "highlighter") return { id, kind: "highlighter", color, size, points };
  if (tool === "rainbow") return { id, kind: "rainbow", color, size, points };
  if (tool === "dashed") return { id, kind: "dashed", color, size, points };
  return null;
}

/** Animated fade for the laser trail. */
export function animateLaserFade(
  overlay: HTMLCanvasElement,
  dpr: number,
  camera: { x: number; y: number; zoom: number },
  points: Point[],
) {
  const start = Date.now();
  const fade = () => {
    const ctx = overlay.getContext("2d")!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    ctx.scale(dpr, dpr);
    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.zoom, camera.zoom);
    const elapsed = Date.now() - start;
    const alpha = Math.max(0, 1 - elapsed / 600);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.beginPath();
    if (points.length > 1) {
      ctx.moveTo(points[0].x, points[0].y);
      for (const p of points) ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    ctx.restore();
    if (alpha > 0) requestAnimationFrame(fade);
    else ctx.clearRect(0, 0, overlay.width, overlay.height);
  };
  fade();
}
