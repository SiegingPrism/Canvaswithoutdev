import type { Point } from "@/lib/whiteboard/types";

export type Camera = { x: number; y: number; zoom: number };

export function toWorld(camera: Camera, sx: number, sy: number): Point {
  return { x: (sx - camera.x) / camera.zoom, y: (sy - camera.y) / camera.zoom };
}

export function wheelZoom(
  camera: Camera,
  e: { clientX: number; clientY: number; deltaX: number; deltaY: number; ctrlKey: boolean; metaKey: boolean },
  rect: DOMRect,
): Camera {
  if (!e.ctrlKey && !e.metaKey) {
    return { x: camera.x - e.deltaX, y: camera.y - e.deltaY, zoom: camera.zoom };
  }
  const sx = e.clientX - rect.left;
  const sy = e.clientY - rect.top;
  const factor = Math.exp(-e.deltaY * 0.002);
  const newZoom = Math.min(4, Math.max(0.2, camera.zoom * factor));
  const wx = (sx - camera.x) / camera.zoom;
  const wy = (sy - camera.y) / camera.zoom;
  return { x: sx - wx * newZoom, y: sy - wy * newZoom, zoom: newZoom };
}
