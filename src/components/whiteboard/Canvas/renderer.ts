import type {
  CanvasObject,
  ImageObject,
  StickyNoteObject,
  TextObject,
  FlashcardObject,
  QuizObject,
  RoadmapNodeObject,
  TimelineObject,
  UMLObject,
  VideoObject,
  AudioObject,
} from "@/lib/whiteboard/types";
import {
  getObjectDef,
  pointsBounds,
  registerObject,
  type RenderCtx,
} from "@/lib/whiteboard/objectRegistry";
import { drawRainbow, drawShape, drawStroke, wrapText } from "./shapes";

/** Draw a single object via the object registry. */
export function drawObject(obj: CanvasObject, rc: RenderCtx) {
  const def = getObjectDef(obj.kind);
  if (!def) return;
  rc.ctx.save();
  def.draw(obj, rc);
  rc.ctx.restore();
}

/** Public bounds accessor via registry, with fallback for stroke objects. */
export function objectBounds(obj: CanvasObject) {
  const def = getObjectDef(obj.kind);
  if (def) return def.bounds(obj);
  if ("points" in obj) return pointsBounds(obj.points);
  return { x: (obj as { x: number }).x, y: (obj as { y: number }).y, w: 0, h: 0 };
}

// ---------- Built-in object renderers ----------

function drawText(ctx: CanvasRenderingContext2D, t: TextObject) {
  if (t.bg) {
    ctx.fillStyle = t.bg;
    ctx.fillRect(t.x, t.y, t.w, t.h);
  }
  ctx.fillStyle = t.color;
  ctx.font = `${t.fontSize}px system-ui, -apple-system, sans-serif`;
  ctx.textBaseline = "top";
  const lines = wrapText(ctx, t.text, t.w - 8);
  lines.forEach((line, i) => {
    ctx.fillText(line, t.x + 4, t.y + 4 + i * (t.fontSize * 1.2));
  });
}

function drawSticky(ctx: CanvasRenderingContext2D, s: StickyNoteObject) {
  ctx.fillStyle = s.color;
  ctx.shadowColor = "rgba(0,0,0,0.15)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 2;
  ctx.fillRect(s.x, s.y, s.w, s.h);
  ctx.shadowColor = "transparent";
  ctx.fillStyle = "#1e293b";
  ctx.font = `16px system-ui, sans-serif`;
  ctx.textBaseline = "top";
  const lines = wrapText(ctx, s.text, s.w - 16);
  lines.forEach((line, i) => {
    ctx.fillText(line, s.x + 8, s.y + 8 + i * 20);
  });
}

function drawImage(o: ImageObject, rc: RenderCtx) {
  let img = rc.imageCache.get(o.src);
  if (!img) {
    img = new Image();
    img.src = o.src;
    img.onload = () => rc.requestRedraw();
    rc.imageCache.set(o.src, img);
  }
  if (img.complete) rc.ctx.drawImage(img, o.x, o.y, o.w, o.h);
}

/** Generic card: rounded rectangle + header pill + body text. Used by feature stubs. */
function drawCard(
  ctx: CanvasRenderingContext2D,
  o: { x: number; y: number; w: number; h: number },
  opts: { fill: string; header: string; headerColor: string; body: string[] },
) {
  const r = 10;
  ctx.fillStyle = opts.fill;
  ctx.strokeStyle = "rgba(15,23,42,0.15)";
  ctx.lineWidth = 1;
  roundRect(ctx, o.x, o.y, o.w, o.h, r);
  ctx.fill();
  ctx.stroke();
  // header pill
  ctx.fillStyle = opts.headerColor;
  ctx.font = "600 11px system-ui, sans-serif";
  ctx.textBaseline = "top";
  ctx.fillText(opts.header, o.x + 12, o.y + 10);
  // body
  ctx.fillStyle = "#1e293b";
  ctx.font = "14px system-ui, sans-serif";
  let y = o.y + 30;
  for (const line of opts.body) {
    const lines = wrapText(ctx, line, o.w - 24);
    for (const l of lines) {
      if (y > o.y + o.h - 16) return;
      ctx.fillText(l, o.x + 12, y);
      y += 18;
    }
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// ---------- Registration ----------

const boxBounds = (o: { x: number; y: number; w: number; h: number }) => ({
  x: o.x,
  y: o.y,
  w: o.w,
  h: o.h,
});

registerObject<import("@/lib/whiteboard/types").PenStroke>({
  kind: "pen",
  label: "Pen",
  draw: (o, { ctx }) => drawStroke(ctx, o, o.color, o.size, 1),
  bounds: (o) => pointsBounds(o.points),
});
registerObject<import("@/lib/whiteboard/types").HighlighterStroke>({
  kind: "highlighter",
  label: "Highlighter",
  draw: (o, { ctx }) => {
    ctx.globalAlpha = 0.35;
    drawStroke(ctx, o, o.color, o.size * 4, 1);
  },
  bounds: (o) => pointsBounds(o.points),
});
registerObject<import("@/lib/whiteboard/types").RainbowStroke>({
  kind: "rainbow",
  label: "Rainbow",
  draw: (o, { ctx }) => drawRainbow(ctx, o),
  bounds: (o) => pointsBounds(o.points),
});
registerObject<import("@/lib/whiteboard/types").DashedStroke>({
  kind: "dashed",
  label: "Dashed",
  draw: (o, { ctx }) => {
    ctx.setLineDash([o.size * 3, o.size * 3]);
    drawStroke(ctx, o, o.color, o.size, 1);
  },
  bounds: (o) => pointsBounds(o.points),
});
registerObject<import("@/lib/whiteboard/types").ShapeStroke>({
  kind: "shape",
  label: "Shape",
  draw: (o, { ctx }) => drawShape(ctx, o),
  bounds: boxBounds,
});
registerObject<TextObject>({
  kind: "text",
  label: "Text",
  draw: (o, { ctx }) => drawText(ctx, o),
  bounds: boxBounds,
});
registerObject<StickyNoteObject>({
  kind: "sticky",
  label: "Sticky note",
  draw: (o, { ctx }) => drawSticky(ctx, o),
  bounds: boxBounds,
});
registerObject<ImageObject>({
  kind: "image",
  label: "Image",
  draw: (o, rc) => drawImage(o, rc),
  bounds: boxBounds,
});

// Feature stubs — placeholder renderers so AI Studio can drop them onto boards.
registerObject<FlashcardObject>({
  kind: "flashcard",
  label: "Flashcard",
  draw: (o, { ctx }) =>
    drawCard(ctx, o, {
      fill: o.color || "#fef3c7",
      headerColor: "#a16207",
      header: o.flipped ? "BACK (double-click)" : "FRONT (double-click)",
      body: [o.flipped ? o.back : o.front],
    }),
  bounds: boxBounds,
});
registerObject<QuizObject>({
  kind: "quiz",
  label: "Quiz",
  draw: (o, { ctx }) => {
    const opts = o.options.map((opt, i) => {
      const marker = o.revealed && i === o.answerIndex ? "✓" : `${String.fromCharCode(65 + i)}.`;
      return `${marker} ${opt}`;
    });
    drawCard(ctx, o, {
      fill: o.revealed ? "#dcfce7" : "#ede9fe",
      headerColor: o.revealed ? "#15803d" : "#6d28d9",
      header: o.revealed ? "QUIZ · ANSWER REVEALED" : "QUIZ (double-click to reveal)",
      body: [o.question, ...opts],
    });
  },
  bounds: boxBounds,
});
registerObject<RoadmapNodeObject>({
  kind: "roadmap",
  label: "Roadmap",
  draw: (o, { ctx }) => {
    const fill = o.status === "done" ? "#dcfce7" : o.status === "doing" ? "#dbeafe" : "#f1f5f9";
    const hc = o.status === "done" ? "#15803d" : o.status === "doing" ? "#1d4ed8" : "#475569";
    drawCard(ctx, o, { fill, headerColor: hc, header: o.status.toUpperCase(), body: [o.title] });
  },
  bounds: boxBounds,
});
registerObject<TimelineObject>({
  kind: "timeline",
  label: "Timeline",
  draw: (o, { ctx }) =>
    drawCard(ctx, o, {
      fill: "#ecfeff",
      headerColor: "#0e7490",
      header: "TIMELINE",
      body: [o.title, ...o.events.map((e) => `• ${e.date} — ${e.label}`)],
    }),
  bounds: boxBounds,
});
registerObject<UMLObject>({
  kind: "uml",
  label: "UML",
  draw: (o, { ctx }) =>
    drawCard(ctx, o, {
      fill: "#f8fafc",
      headerColor: "#0f172a",
      header: `UML · ${o.umlType.toUpperCase()}`,
      body: [o.title, ...o.lines],
    }),
  bounds: boxBounds,
});
registerObject<VideoObject>({
  kind: "video",
  label: "Video",
  draw: (o, { ctx }) =>
    drawCard(ctx, o, {
      fill: "#fee2e2",
      headerColor: "#b91c1c",
      header: "▶ VIDEO",
      body: [o.title ?? o.src],
    }),
  bounds: boxBounds,
});
registerObject<AudioObject>({
  kind: "audio",
  label: "Audio",
  draw: (o, { ctx }) =>
    drawCard(ctx, o, {
      fill: "#fce7f3",
      headerColor: "#be185d",
      header: "♪ AUDIO",
      body: [o.title ?? o.src],
    }),
  bounds: boxBounds,
});
