import type { CanvasObject } from "@/lib/whiteboard/types";
import { objectBounds } from "./renderer";
import type { Camera } from "./camera";

export type GuideLine = { axis: "x" | "y"; value: number };

export type SnapResult = {
  dx: number;
  dy: number;
  guides: GuideLine[];
};

/**
 * Smart guides (PRD Doc 3 §12): snap a moving object's edges/center to the
 * edges/centers of other objects on the page. Returns the adjusted deltas
 * plus guide lines to render.
 */
export function snapMove(
  moving: CanvasObject,
  dx: number,
  dy: number,
  others: CanvasObject[],
  zoom: number,
): SnapResult {
  const threshold = 6 / zoom;
  const b = objectBounds(moving);
  const cand = { x: b.x + dx, y: b.y + dy, w: b.w, h: b.h };
  const movingXs = [cand.x, cand.x + cand.w / 2, cand.x + cand.w];
  const movingYs = [cand.y, cand.y + cand.h / 2, cand.y + cand.h];

  let bestX: { diff: number; value: number } | null = null;
  let bestY: { diff: number; value: number } | null = null;

  for (const o of others) {
    if (o.id === moving.id) continue;
    const ob = objectBounds(o);
    const targetXs = [ob.x, ob.x + ob.w / 2, ob.x + ob.w];
    const targetYs = [ob.y, ob.y + ob.h / 2, ob.y + ob.h];
    for (const mx of movingXs) {
      for (const tx of targetXs) {
        const diff = tx - mx;
        if (Math.abs(diff) < threshold && (!bestX || Math.abs(diff) < Math.abs(bestX.diff))) {
          bestX = { diff, value: tx };
        }
      }
    }
    for (const my of movingYs) {
      for (const ty of targetYs) {
        const diff = ty - my;
        if (Math.abs(diff) < threshold && (!bestY || Math.abs(diff) < Math.abs(bestY.diff))) {
          bestY = { diff, value: ty };
        }
      }
    }
  }

  const guides: GuideLine[] = [];
  if (bestX) guides.push({ axis: "x", value: bestX.value });
  if (bestY) guides.push({ axis: "y", value: bestY.value });
  return {
    dx: dx + (bestX?.diff ?? 0),
    dy: dy + (bestY?.diff ?? 0),
    guides,
  };
}

/** Render guide lines onto the overlay canvas. */
export function drawGuides(
  overlay: HTMLCanvasElement,
  dpr: number,
  camera: Camera,
  guides: GuideLine[],
) {
  const ctx = overlay.getContext("2d")!;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, overlay.width, overlay.height);
  if (!guides.length) return;
  ctx.scale(dpr, dpr);
  const w = overlay.width / dpr;
  const h = overlay.height / dpr;
  ctx.strokeStyle = "#f43f5e";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  for (const g of guides) {
    ctx.beginPath();
    if (g.axis === "x") {
      const sx = g.value * camera.zoom + camera.x;
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, h);
    } else {
      const sy = g.value * camera.zoom + camera.y;
      ctx.moveTo(0, sy);
      ctx.lineTo(w, sy);
    }
    ctx.stroke();
  }
  ctx.setLineDash([]);
}
