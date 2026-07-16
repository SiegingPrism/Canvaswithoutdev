import type { ShapeKind, ShapeStroke, StrokeBase } from "@/lib/whiteboard/types";

export function drawStroke(
  ctx: CanvasRenderingContext2D,
  s: StrokeBase,
  color: string,
  width: number,
  alpha = 1,
) {
  if (s.points.length < 2) return;
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(s.points[0].x, s.points[0].y);
  for (let i = 1; i < s.points.length; i++) {
    const p = s.points[i];
    const prev = s.points[i - 1];
    ctx.quadraticCurveTo(prev.x, prev.y, (prev.x + p.x) / 2, (prev.y + p.y) / 2);
  }
  ctx.stroke();
}

export function drawRainbow(ctx: CanvasRenderingContext2D, s: StrokeBase) {
  if (s.points.length < 2) return;
  ctx.lineWidth = s.size;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let i = 1; i < s.points.length; i++) {
    const h = (i * 8) % 360;
    ctx.strokeStyle = `hsl(${h}, 90%, 55%)`;
    ctx.beginPath();
    ctx.moveTo(s.points[i - 1].x, s.points[i - 1].y);
    ctx.lineTo(s.points[i].x, s.points[i].y);
    ctx.stroke();
  }
}

function polygonPath(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  sides: number,
  startAngle = -Math.PI / 2,
) {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = startAngle + (i * Math.PI * 2) / sides;
    const x = cx + Math.cos(a) * rx;
    const y = cy + Math.sin(a) * ry;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function arrowHead(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  size: number,
) {
  const a = Math.atan2(toY - fromY, toX - fromX);
  const h = Math.max(8, size * 3);
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - h * Math.cos(a - Math.PI / 6), toY - h * Math.sin(a - Math.PI / 6));
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - h * Math.cos(a + Math.PI / 6), toY - h * Math.sin(a + Math.PI / 6));
  ctx.stroke();
}

export function drawShape(ctx: CanvasRenderingContext2D, s: ShapeStroke) {
  ctx.strokeStyle = s.color;
  ctx.lineWidth = s.size;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const { x, y, w, h, shape } = s;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const rx = Math.abs(w / 2);
  const ry = Math.abs(h / 2);
  const fill = () => {
    if (s.fill) {
      ctx.fillStyle = s.fill;
      ctx.fill();
    }
  };

  switch (shape) {
    case "rect":
    case "process":
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      fill();
      ctx.stroke();
      return;
    case "roundedRect":
    case "terminator":
      roundRectPath(ctx, x, y, w, h, shape === "terminator" ? Math.min(rx, ry) : 12);
      fill();
      ctx.stroke();
      return;
    case "circle":
    case "ellipse":
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      fill();
      ctx.stroke();
      return;
    case "triangle":
      ctx.beginPath();
      ctx.moveTo(cx, y);
      ctx.lineTo(x, y + h);
      ctx.lineTo(x + w, y + h);
      ctx.closePath();
      fill();
      ctx.stroke();
      return;
    case "diamond":
    case "decision":
      ctx.beginPath();
      ctx.moveTo(cx, y);
      ctx.lineTo(x + w, cy);
      ctx.lineTo(cx, y + h);
      ctx.lineTo(x, cy);
      ctx.closePath();
      fill();
      ctx.stroke();
      return;
    case "pentagon":
      polygonPath(ctx, cx, cy, rx, ry, 5);
      fill();
      ctx.stroke();
      return;
    case "hexagon":
      polygonPath(ctx, cx, cy, rx, ry, 6, 0);
      fill();
      ctx.stroke();
      return;
    case "octagon":
      polygonPath(ctx, cx, cy, rx, ry, 8);
      fill();
      ctx.stroke();
      return;
    case "star": {
      ctx.beginPath();
      const spikes = 5;
      for (let i = 0; i < spikes * 2; i++) {
        const r = i % 2 === 0 ? Math.min(rx, ry) : Math.min(rx, ry) * 0.45;
        const a = -Math.PI / 2 + (i * Math.PI) / spikes;
        const px = cx + Math.cos(a) * r;
        const py = cy + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      fill();
      ctx.stroke();
      return;
    }
    case "heart": {
      ctx.beginPath();
      const topY = y + h * 0.3;
      ctx.moveTo(cx, y + h);
      ctx.bezierCurveTo(x, y + h * 0.7, x, topY - h * 0.1, cx, topY);
      ctx.bezierCurveTo(x + w, topY - h * 0.1, x + w, y + h * 0.7, cx, y + h);
      ctx.closePath();
      fill();
      ctx.stroke();
      return;
    }
    case "line":
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + w, y + h);
      ctx.stroke();
      return;
    case "arrow":
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + w, y + h);
      ctx.stroke();
      arrowHead(ctx, x, y, x + w, y + h, s.size);
      return;
    case "doubleArrow":
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + w, y + h);
      ctx.stroke();
      arrowHead(ctx, x, y, x + w, y + h, s.size);
      arrowHead(ctx, x + w, y + h, x, y, s.size);
      return;
    case "elbowArrow":
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x + w, y + h);
      ctx.stroke();
      arrowHead(ctx, x + w, y, x + w, y + h, s.size);
      return;
    case "data": {
      const skew = Math.min(20, Math.abs(w) * 0.15);
      ctx.beginPath();
      ctx.moveTo(x + skew, y);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x + w - skew, y + h);
      ctx.lineTo(x, y + h);
      ctx.closePath();
      fill();
      ctx.stroke();
      return;
    }
    case "document": {
      const wave = h * 0.15;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x + w, y + h - wave);
      ctx.quadraticCurveTo(x + w * 0.75, y + h + wave, x + w / 2, y + h - wave / 2);
      ctx.quadraticCurveTo(x + w * 0.25, y + h - wave * 2, x, y + h - wave);
      ctx.closePath();
      fill();
      ctx.stroke();
      return;
    }
    case "database": {
      const ellH = Math.min(h * 0.2, 24);
      ctx.beginPath();
      ctx.ellipse(cx, y + ellH / 2, rx, ellH / 2, 0, 0, Math.PI * 2);
      fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y + ellH / 2);
      ctx.lineTo(x, y + h - ellH / 2);
      ctx.moveTo(x + w, y + ellH / 2);
      ctx.lineTo(x + w, y + h - ellH / 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(cx, y + h - ellH / 2, rx, ellH / 2, 0, 0, Math.PI);
      ctx.stroke();
      return;
    }
    case "manualInput": {
      ctx.beginPath();
      ctx.moveTo(x, y + h * 0.3);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x, y + h);
      ctx.closePath();
      fill();
      ctx.stroke();
      return;
    }
    case "connector":
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      fill();
      ctx.stroke();
      return;
    case "cloud": {
      ctx.beginPath();
      const r = Math.min(rx, ry) * 0.5;
      ctx.moveTo(x, cy);
      ctx.bezierCurveTo(x, y + r, x + r, y, cx, y + r);
      ctx.bezierCurveTo(cx - r * 0.2, y - r * 0.2, x + w - r, y, x + w, cy);
      ctx.bezierCurveTo(x + w + r * 0.3, cy + r, x + w - r, y + h, cx, y + h - r * 0.2);
      ctx.bezierCurveTo(x + r, y + h + r * 0.3, x - r * 0.3, y + h - r, x, cy);
      ctx.closePath();
      fill();
      ctx.stroke();
      return;
    }
    case "speech": {
      const tailH = h * 0.25;
      const bodyH = h - tailH;
      roundRectPath(ctx, x, y, w, bodyH, 12);
      fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + w * 0.2, y + bodyH);
      ctx.lineTo(x + w * 0.15, y + h);
      ctx.lineTo(x + w * 0.35, y + bodyH);
      ctx.closePath();
      if (s.fill) ctx.fill();
      ctx.stroke();
      return;
    }
  }
}

export const SHAPE_LIBRARY: Array<{
  category: string;
  items: Array<{ kind: ShapeKind; label: string }>;
}> = [
  {
    category: "General",
    items: [
      { kind: "rect", label: "Rectangle" },
      { kind: "roundedRect", label: "Rounded" },
      { kind: "circle", label: "Circle" },
      { kind: "ellipse", label: "Ellipse" },
      { kind: "triangle", label: "Triangle" },
      { kind: "diamond", label: "Diamond" },
      { kind: "pentagon", label: "Pentagon" },
      { kind: "hexagon", label: "Hexagon" },
      { kind: "octagon", label: "Octagon" },
      { kind: "star", label: "Star" },
      { kind: "heart", label: "Heart" },
    ],
  },
  {
    category: "Lines & Arrows",
    items: [
      { kind: "line", label: "Line" },
      { kind: "arrow", label: "Arrow" },
      { kind: "doubleArrow", label: "Double" },
      { kind: "elbowArrow", label: "Elbow" },
    ],
  },
  {
    category: "Flowchart",
    items: [
      { kind: "process", label: "Process" },
      { kind: "decision", label: "Decision" },
      { kind: "data", label: "Data" },
      { kind: "terminator", label: "Terminator" },
      { kind: "document", label: "Document" },
      { kind: "database", label: "Database" },
      { kind: "manualInput", label: "Input" },
      { kind: "connector", label: "Connector" },
    ],
  },
  {
    category: "Callouts",
    items: [
      { kind: "speech", label: "Speech" },
      { kind: "cloud", label: "Cloud" },
    ],
  },
];

export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
  const words = text.split(/(\s+)/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur + w;
    if (ctx.measureText(test).width > maxW && cur) {
      lines.push(cur);
      cur = w.trimStart();
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}
