import type { CanvasObject, CanvasObjectKind } from "./types";

export type Bounds = { x: number; y: number; w: number; h: number };

export type RenderCtx = {
  ctx: CanvasRenderingContext2D;
  requestRedraw: () => void;
  imageCache: Map<string, HTMLImageElement>;
};

export type ObjectDef<T extends CanvasObject = CanvasObject> = {
  kind: CanvasObjectKind;
  /** Draw the object in world coordinates. */
  draw: (obj: T, rc: RenderCtx) => void;
  /** Axis-aligned bounds in world coordinates. */
  bounds: (obj: T) => Bounds;
  /** Whether the object can be resized (default: true for box objects). */
  resizable?: boolean;
  /** Display label for palettes / AI Studio. */
  label: string;
};

const registry = new Map<CanvasObjectKind, ObjectDef>();

export function registerObject<T extends CanvasObject>(def: ObjectDef<T>) {
  registry.set(def.kind, def as unknown as ObjectDef);
}

export function getObjectDef(kind: CanvasObjectKind): ObjectDef | undefined {
  return registry.get(kind);
}

export function allObjectDefs(): ObjectDef[] {
  return Array.from(registry.values());
}

/** Generic bounds for stroke objects. */
export function pointsBounds(points: { x: number; y: number }[]): Bounds {
  if (!points.length) return { x: 0, y: 0, w: 0, h: 0 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { x: minX - 4, y: minY - 4, w: maxX - minX + 8, h: maxY - minY + 8 };
}
