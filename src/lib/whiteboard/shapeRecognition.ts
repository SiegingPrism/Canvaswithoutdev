import type { Point, ShapeKind, ShapeStroke } from "./types";

/**
 * Recognize a hand-drawn stroke as one of many shape kinds:
 * rect, roundedRect, circle, ellipse, triangle, diamond,
 * pentagon, hexagon, octagon, star, line, arrow.
 * Returns null when confidence is too low.
 */
export function recognizeShape(
  points: Point[],
  color: string,
  size: number,
): Omit<ShapeStroke, "id"> | null {
  if (points.length < 8) return null;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const w = maxX - minX;
  const h = maxY - minY;
  if (w < 20 && h < 20) return null;

  const first = points[0];
  const last = points[points.length - 1];
  const closed =
    Math.hypot(first.x - last.x, first.y - last.y) <
    0.25 * Math.max(w, h);

  // Line / arrow (open stroke, mostly straight)
  if (!closed) {
    const len = Math.hypot(last.x - first.x, last.y - first.y);
    let maxDev = 0;
    for (const p of points) {
      const t =
        ((p.x - first.x) * (last.x - first.x) +
          (p.y - first.y) * (last.y - first.y)) /
        (len * len || 1);
      const cx = first.x + t * (last.x - first.x);
      const cy = first.y + t * (last.y - first.y);
      maxDev = Math.max(maxDev, Math.hypot(p.x - cx, p.y - cy));
    }
    if (len > 40 && maxDev / len < 0.08) {
      // Arrowhead heuristic: last ~15% of points diverges sharply
      const tail = points.slice(-Math.max(3, Math.floor(points.length * 0.15)));
      const tailLen = Math.hypot(
        tail[tail.length - 1].x - tail[0].x,
        tail[tail.length - 1].y - tail[0].y,
      );
      const mainAngle = Math.atan2(last.y - first.y, last.x - first.x);
      let tailDev = 0;
      for (const p of tail) {
        const t =
          ((p.x - first.x) * (last.x - first.x) +
            (p.y - first.y) * (last.y - first.y)) /
          (len * len || 1);
        const cx = first.x + t * (last.x - first.x);
        const cy = first.y + t * (last.y - first.y);
        tailDev = Math.max(tailDev, Math.hypot(p.x - cx, p.y - cy));
      }
      const isArrow = tailLen > 8 && tailDev / len > 0.06;
      void mainAngle;
      const base = {
        kind: "shape" as const,
        color,
        size,
        x: first.x,
        y: first.y,
        w: last.x - first.x,
        h: last.y - first.y,
      };
      return { ...base, shape: (isArrow ? "arrow" : "line") satisfies ShapeKind };
    }
    return null;
  }

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const aspect = w / Math.max(1, h);

  // Circle / ellipse: radial deviation from ellipse
  {
    const rx = w / 2;
    const ry = h / 2;
    let dev = 0;
    for (const p of points) {
      const dx = (p.x - cx) / rx;
      const dy = (p.y - cy) / ry;
      dev += Math.abs(Math.hypot(dx, dy) - 1);
    }
    dev /= points.length;
    if (dev < 0.18) {
      const shape: ShapeKind = aspect > 0.85 && aspect < 1.15 ? "circle" : "ellipse";
      return { kind: "shape", shape, color, size, x: minX, y: minY, w, h };
    }
  }

  // Polygon corner counting
  const corners = countCorners(points);
  const shapeByCorners: Record<number, ShapeKind> = {
    3: "triangle",
    4: "rect",
    5: "pentagon",
    6: "hexagon",
    8: "octagon",
  };
  if (shapeByCorners[corners]) {
    let shape = shapeByCorners[corners];
    // Diamond vs rect: check if corners are roughly at N/E/S/W
    if (corners === 4) {
      const midDist = averageDistToMidpoints(points, minX, minY, w, h);
      const cornerDist = averageDistToCorners(points, minX, minY, w, h);
      if (midDist < cornerDist * 0.7) shape = "diamond";
    }
    return { kind: "shape", shape, color, size, x: minX, y: minY, w, h };
  }
  // Star heuristic: many corners
  if (corners >= 8) {
    return { kind: "shape", shape: "star", color, size, x: minX, y: minY, w, h };
  }
  return null;
}

function countCorners(points: Point[]) {
  const step = Math.max(1, Math.floor(points.length / 40));
  let corners = 0;
  let lastCornerIdx = -Infinity;
  for (let i = step; i < points.length - step; i += step) {
    const a = points[i - step];
    const b = points[i];
    const c = points[i + step];
    const ang = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(b.y - a.y, b.x - a.x);
    const norm = Math.abs(Math.atan2(Math.sin(ang), Math.cos(ang)));
    if (norm > 0.7 && i - lastCornerIdx > step * 2) {
      corners++;
      lastCornerIdx = i;
    }
  }
  return corners;
}

function averageDistToCorners(pts: Point[], x: number, y: number, w: number, h: number) {
  const corners = [
    { x, y },
    { x: x + w, y },
    { x, y: y + h },
    { x: x + w, y: y + h },
  ];
  let sum = 0;
  for (const c of corners) {
    let m = Infinity;
    for (const p of pts) m = Math.min(m, Math.hypot(p.x - c.x, p.y - c.y));
    sum += m;
  }
  return sum / 4;
}

function averageDistToMidpoints(pts: Point[], x: number, y: number, w: number, h: number) {
  const mids = [
    { x: x + w / 2, y },
    { x: x + w, y: y + h / 2 },
    { x: x + w / 2, y: y + h },
    { x, y: y + h / 2 },
  ];
  let sum = 0;
  for (const c of mids) {
    let m = Infinity;
    for (const p of pts) m = Math.min(m, Math.hypot(p.x - c.x, p.y - c.y));
    sum += m;
  }
  return sum / 4;
}
