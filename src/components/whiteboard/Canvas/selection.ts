import type { CanvasObject, Point } from "@/lib/whiteboard/types";
import { objectBounds } from "./renderer";

export type Handle = { type: "move" } | { type: "resize"; corner: "nw" | "ne" | "sw" | "se" };

export function hitTest(objects: CanvasObject[], pt: Point): CanvasObject | null {
  for (let i = objects.length - 1; i >= 0; i--) {
    const obj = objects[i];
    const b = objectBounds(obj);
    if (pt.x >= b.x && pt.x <= b.x + b.w && pt.y >= b.y && pt.y <= b.y + b.h) {
      return obj;
    }
  }
  return null;
}

export function getHandleAt(pt: Point, obj: CanvasObject, zoom: number): Handle {
  const b = objectBounds(obj);
  const h = 10 / zoom;
  const corners: Array<[number, number, "nw" | "ne" | "sw" | "se"]> = [
    [b.x, b.y, "nw"],
    [b.x + b.w, b.y, "ne"],
    [b.x, b.y + b.h, "sw"],
    [b.x + b.w, b.y + b.h, "se"],
  ];
  for (const [cx, cy, corner] of corners) {
    if (Math.abs(pt.x - cx) < h && Math.abs(pt.y - cy) < h) return { type: "resize", corner };
  }
  return { type: "move" };
}

export function drawSelection(
  ctx: CanvasRenderingContext2D,
  obj: CanvasObject,
  camera: { x: number; y: number; zoom: number },
) {
  const b = objectBounds(obj);
  ctx.save();
  ctx.translate(camera.x, camera.y);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.strokeStyle = "#3b82f6";
  ctx.lineWidth = 1.5 / camera.zoom;
  ctx.setLineDash([6 / camera.zoom, 4 / camera.zoom]);
  ctx.strokeRect(b.x, b.y, b.w, b.h);
  ctx.setLineDash([]);
  const handleSize = 8 / camera.zoom;
  ctx.fillStyle = "#ffffff";
  for (const [cx, cy] of [
    [b.x, b.y],
    [b.x + b.w, b.y],
    [b.x, b.y + b.h],
    [b.x + b.w, b.y + b.h],
  ] as const) {
    ctx.fillRect(cx - handleSize / 2, cy - handleSize / 2, handleSize, handleSize);
    ctx.strokeRect(cx - handleSize / 2, cy - handleSize / 2, handleSize, handleSize);
  }
  ctx.restore();
}
