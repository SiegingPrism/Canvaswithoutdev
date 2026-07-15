import type { BackgroundStyle, Page } from "@/lib/whiteboard/types";

const BG_PALETTE: Record<string, string> = {
  white: "#ffffff",
  black: "#0f172a",
  gray: "#e5e7eb",
  blue: "#dbeafe",
  green: "#dcfce7",
  yellow: "#fef9c3",
  beige: "#f5f0e6",
};

export const BACKGROUND_STYLES: BackgroundStyle[] = ["blank", "grid", "dots", "lined"];
export const BACKGROUND_COLORS = Object.entries(BG_PALETTE).map(([name, hex]) => ({
  name,
  hex,
}));

/** Derive a concrete style + color from either the new fields or legacy `background`. */
export function resolveBackground(page: Page): { style: BackgroundStyle; color: string } {
  const style: BackgroundStyle =
    page.bgStyle ??
    (page.background === "white" || page.background === "dark"
      ? "blank"
      : (page.background as BackgroundStyle));
  const color =
    page.bgColor ?? (page.background === "dark" ? BG_PALETTE.black : BG_PALETTE.white);
  return { style, color };
}

function relLuminance(hex: string): number {
  const m = hex.replace("#", "");
  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16) / 255;
  const b = parseInt(m.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  bg: Page["background"] | Page,
  camera: { x: number; y: number; zoom: number },
) {
  const page: Page =
    typeof bg === "string"
      ? ({ id: "", objects: [], background: bg } as Page)
      : (bg as Page);
  const { style, color } = resolveBackground(page);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);
  if (style === "blank") return;

  const lum = relLuminance(color);
  const lineColor = lum > 0.5 ? "rgba(15,23,42,0.18)" : "rgba(255,255,255,0.22)";
  const dotColor = lum > 0.5 ? "rgba(15,23,42,0.35)" : "rgba(255,255,255,0.4)";
  const step = 24 * camera.zoom;
  const ox = camera.x % step;
  const oy = camera.y % step;

  if (style === "grid") {
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1;
    for (let x = ox; x < w; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = oy; y < h; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  } else if (style === "dots") {
    ctx.fillStyle = dotColor;
    for (let x = ox; x < w; x += step) {
      for (let y = oy; y < h; y += step) {
        ctx.beginPath();
        ctx.arc(x, y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (style === "lined") {
    ctx.strokeStyle = lineColor;
    for (let y = oy; y < h; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  }
}
