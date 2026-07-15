import type { Page } from "./types";
import { drawObject, objectBounds } from "@/components/whiteboard/Canvas/renderer";
import { resolveBackground } from "@/components/whiteboard/Canvas/background";

const THUMB_W = 400;
const THUMB_H = 300;

function pageBgColor(page: Page): string {
  return resolveBackground(page).color;
}


/** Render a page's objects to a small dataURL thumbnail. Returns null if empty. */
export function generatePageThumbnail(page: Page): string | null {
  if (typeof document === "undefined") return null;
  if (page.objects.length === 0) return null;

  // Compute content bounds
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const obj of page.objects) {
    const b = objectBounds(obj);
    if (b.x < minX) minX = b.x;
    if (b.y < minY) minY = b.y;
    if (b.x + b.w > maxX) maxX = b.x + b.w;
    if (b.y + b.h > maxY) maxY = b.y + b.h;
  }
  if (!isFinite(minX)) return null;

  const pad = 40;
  const cw = Math.max(1, maxX - minX) + pad * 2;
  const ch = Math.max(1, maxY - minY) + pad * 2;
  const scale = Math.min(THUMB_W / cw, THUMB_H / ch);

  const canvas = document.createElement("canvas");
  canvas.width = THUMB_W;
  canvas.height = THUMB_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = pageBgColor(page);
  ctx.fillRect(0, 0, THUMB_W, THUMB_H);

  // Center content
  const offX = (THUMB_W - cw * scale) / 2;
  const offY = (THUMB_H - ch * scale) / 2;
  ctx.save();
  ctx.translate(offX - (minX - pad) * scale, offY - (minY - pad) * scale);
  ctx.scale(scale, scale);
  const rc = { ctx, requestRedraw: () => {}, imageCache: new Map<string, HTMLImageElement>() };
  for (const obj of page.objects) {
    try {
      drawObject(obj, rc);
    } catch {
      /* ignore per-object failures */
    }
  }
  ctx.restore();

  try {
    return canvas.toDataURL("image/jpeg", 0.7);
  } catch {
    return null;
  }
}
