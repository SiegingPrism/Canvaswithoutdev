import { useState } from "react";
import { useWhiteboard } from "@/lib/whiteboard/store";
import { getAllTools, type ToolDef } from "@/lib/registry/toolRegistry";
import { Palette, Trash2, Shapes, Star, Sparkles } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { SHAPE_LIBRARY } from "./Canvas/shapes";
import type { ShapeStroke } from "@/lib/whiteboard/types";

const PALETTE = [
  "#000000", "#374151", "#6b7280", "#9ca3af", "#d1d5db", "#ffffff",
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16", "#22c55e",
  "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1",
  "#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e", "#78350f",
];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function Toolbar() {
  const {
    tool, setTool,
    color, setColor,
    size, setSize,
    clearPage, pushHistory,
    recentColors, favoriteColors, toggleFavoriteColor,
    autoRecognizeShape, setAutoRecognizeShape,
    addObject, camera,
  } = useWhiteboard();
  const [swipe, setSwipe] = useState(0);
  const tools: ToolDef[] = getAllTools();

  const insertShape = (shape: ShapeStroke["shape"]) => {
    const w = 160;
    const h = 100;
    const cx = (window.innerWidth / 2 - camera.x) / camera.zoom - w / 2;
    const cy = (window.innerHeight / 2 - camera.y) / camera.zoom - h / 2;
    const obj: ShapeStroke = {
      id: uid(),
      kind: "shape",
      shape,
      color,
      size: Math.max(2, size),
      x: cx,
      y: cy,
      w,
      h,
    };
    pushHistory();
    addObject(obj);
  };

  return (
    <div className="pointer-events-auto flex flex-col items-center gap-2 rounded-2xl bg-card/95 p-2 shadow-lg ring-1 ring-border backdrop-blur">
      <div className="grid grid-cols-2 gap-1 lg:grid-cols-1">
        {tools.map((t) => {
          const Icon = t.icon;
          const active = tool === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              title={t.shortcut ? `${t.label} (${t.shortcut})` : t.label}
              className={cn(
                "grid h-10 w-10 place-items-center rounded-lg transition",
                active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent",
              )}
            >
              <Icon className="h-5 w-5" />
            </button>
          );
        })}
      </div>

      <div className="h-px w-8 bg-border" />

      {/* Shapes library */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            className="grid h-10 w-10 place-items-center rounded-lg text-foreground hover:bg-accent"
            title="Shapes library"
          >
            <Shapes className="h-5 w-5" />
          </button>
        </PopoverTrigger>
        <PopoverContent side="right" className="w-72 max-h-[70vh] overflow-y-auto space-y-3">
          {SHAPE_LIBRARY.map((cat) => (
            <div key={cat.category}>
              <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {cat.category}
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {cat.items.map((it) => (
                  <button
                    key={it.kind}
                    onClick={() => insertShape(it.kind)}
                    title={it.label}
                    className="flex flex-col items-center gap-0.5 rounded-md p-1.5 hover:bg-accent"
                  >
                    <ShapeIcon kind={it.kind} color={color} />
                    <span className="truncate text-[10px] text-muted-foreground">{it.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </PopoverContent>
      </Popover>

      {/* Color popover */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            className="grid h-10 w-10 place-items-center rounded-lg hover:bg-accent"
            title="Color & size"
          >
            <span
              className="h-6 w-6 rounded-full ring-2 ring-border"
              style={{ backgroundColor: color }}
            />
          </button>
        </PopoverTrigger>
        <PopoverContent side="right" className="w-72 space-y-3">
          <div>
            <div className="mb-1.5 flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Palette className="h-3.5 w-3.5" /> Palette
            </div>
            <div className="grid grid-cols-6 gap-1.5">
              {PALETTE.map((c) => (
                <ColorSwatch key={c} c={c} active={color === c} onPick={() => setColor(c)} onFav={() => toggleFavoriteColor(c)} favorited={favoriteColors.includes(c)} />
              ))}
            </div>
          </div>

          {favoriteColors.length > 0 && (
            <div>
              <div className="mb-1.5 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Star className="h-3.5 w-3.5" /> Favorites
              </div>
              <div className="grid grid-cols-6 gap-1.5">
                {favoriteColors.map((c) => (
                  <ColorSwatch key={c} c={c} active={color === c} onPick={() => setColor(c)} onFav={() => toggleFavoriteColor(c)} favorited />
                ))}
              </div>
            </div>
          )}

          {recentColors.length > 0 && (
            <div>
              <div className="mb-1.5 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5" /> Recent
              </div>
              <div className="grid grid-cols-6 gap-1.5">
                {recentColors.map((c) => (
                  <ColorSwatch key={c} c={c} active={color === c} onPick={() => setColor(c)} onFav={() => toggleFavoriteColor(c)} favorited={favoriteColors.includes(c)} />
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="mb-1 text-xs font-medium text-muted-foreground">Custom color</div>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-9 w-full cursor-pointer rounded"
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Thickness</span>
              <span>{size}px</span>
            </div>
            <Slider
              value={[size]}
              min={1}
              max={30}
              step={1}
              onValueChange={(v) => setSize(v[0])}
            />
          </div>

          <div className="flex items-center justify-between rounded-md border p-2">
            <div>
              <div className="text-xs font-medium">Auto-recognize shapes</div>
              <div className="text-[10px] text-muted-foreground">Convert sketches to clean shapes</div>
            </div>
            <Switch checked={autoRecognizeShape} onCheckedChange={setAutoRecognizeShape} />
          </div>
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <button className="grid h-10 w-10 place-items-center rounded-lg hover:bg-accent" title="Clear">
            <Trash2 className="h-5 w-5 text-destructive" />
          </button>
        </PopoverTrigger>
        <PopoverContent side="right" className="w-64 space-y-2">
          <p className="text-sm font-medium">Swipe to clear all</p>
          <p className="text-xs text-muted-foreground">Drag to 100 to wipe this page.</p>
          <Slider
            value={[swipe]}
            min={0}
            max={100}
            onValueChange={(v) => {
              setSwipe(v[0]);
              if (v[0] >= 100) {
                pushHistory();
                clearPage();
                setTimeout(() => setSwipe(0), 200);
              }
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function ColorSwatch({
  c, active, onPick, onFav, favorited,
}: { c: string; active: boolean; onPick: () => void; onFav: () => void; favorited: boolean }) {
  return (
    <button
      onClick={onPick}
      onContextMenu={(e) => { e.preventDefault(); onFav(); }}
      className={cn(
        "relative h-7 w-7 rounded-full ring-2 transition",
        active ? "ring-primary" : "ring-border hover:ring-foreground/30",
      )}
      style={{ backgroundColor: c }}
      title={favorited ? "Right-click to unfavorite" : "Right-click to favorite"}
    >
      {favorited && (
        <Star className="pointer-events-none absolute -right-0.5 -top-0.5 h-2.5 w-2.5 fill-yellow-400 text-yellow-500" />
      )}
    </button>
  );
}

function ShapeIcon({ kind, color }: { kind: string; color: string }) {
  // Small SVG glyph per shape kind
  const stroke = color;
  const common = { stroke, strokeWidth: 1.5, fill: "none" } as const;
  const size = 28;
  const wrap = (children: React.ReactNode) => (
    <svg width={size} height={size} viewBox="0 0 24 24">{children}</svg>
  );
  switch (kind) {
    case "rect":
    case "process":
      return wrap(<rect x="3" y="6" width="18" height="12" {...common} />);
    case "roundedRect":
    case "terminator":
      return wrap(<rect x="3" y="6" width="18" height="12" rx="4" {...common} />);
    case "circle":
      return wrap(<circle cx="12" cy="12" r="8" {...common} />);
    case "ellipse":
      return wrap(<ellipse cx="12" cy="12" rx="9" ry="6" {...common} />);
    case "triangle":
      return wrap(<polygon points="12,4 3,20 21,20" {...common} />);
    case "diamond":
    case "decision":
      return wrap(<polygon points="12,3 21,12 12,21 3,12" {...common} />);
    case "pentagon":
      return wrap(<polygon points="12,3 21,10 17,20 7,20 3,10" {...common} />);
    case "hexagon":
      return wrap(<polygon points="6,4 18,4 22,12 18,20 6,20 2,12" {...common} />);
    case "octagon":
      return wrap(<polygon points="8,3 16,3 21,8 21,16 16,21 8,21 3,16 3,8" {...common} />);
    case "star":
      return wrap(<polygon points="12,3 14.5,9.5 21,10 16,14.5 17.5,21 12,17.5 6.5,21 8,14.5 3,10 9.5,9.5" {...common} />);
    case "heart":
      return wrap(<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" {...common} />);
    case "line":
      return wrap(<line x1="4" y1="20" x2="20" y2="4" {...common} />);
    case "arrow":
      return wrap(<g {...common}><line x1="4" y1="20" x2="19" y2="5" /><polyline points="12,5 19,5 19,12" /></g>);
    case "doubleArrow":
      return wrap(<g {...common}><line x1="5" y1="12" x2="19" y2="12" /><polyline points="8,8 4,12 8,16" /><polyline points="16,8 20,12 16,16" /></g>);
    case "elbowArrow":
      return wrap(<g {...common}><polyline points="4,6 18,6 18,18" /><polyline points="14,14 18,18 14,18" /></g>);
    case "data":
      return wrap(<polygon points="7,6 21,6 17,18 3,18" {...common} />);
    case "document":
      return wrap(<path d="M3 5h18v12c-3 2-6 -2-9 0s-6-2-9 0z" {...common} />);
    case "database":
      return wrap(<g {...common}><ellipse cx="12" cy="6" rx="8" ry="2.5"/><path d="M4 6v12c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5V6" /></g>);
    case "manualInput":
      return wrap(<polygon points="3,9 21,4 21,18 3,18" {...common} />);
    case "connector":
      return wrap(<circle cx="12" cy="12" r="6" {...common} />);
    case "cloud":
      return wrap(<path d="M7 17a4 4 0 0 1 0-8 5 5 0 0 1 9.5-1 4 4 0 0 1 .5 9z" {...common} />);
    case "speech":
      return wrap(<path d="M4 5h16v10H10l-4 4v-4H4z" {...common} />);
    default:
      return wrap(<rect x="4" y="4" width="16" height="16" {...common} />);
  }
}
