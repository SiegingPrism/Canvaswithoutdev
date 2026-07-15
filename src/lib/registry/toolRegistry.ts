import type { ComponentType } from "react";
import type { ToolId } from "@/lib/whiteboard/types";
import {
  Eraser,
  Hand,
  Highlighter,
  MousePointer2,
  Minus,
  Pen,
  Shapes,
  Sparkles,
  Trash2,
  Type,
  Zap,
} from "lucide-react";

export type ToolCategory = "select" | "draw" | "insert" | "erase";

export type ToolDef = {
  id: ToolId;
  label: string;
  icon: ComponentType<{ className?: string }>;
  category: ToolCategory;
  shortcut?: string;
  cursor?: string;
  /** Optional per-tool settings hint for future palettes. */
  settings?: {
    color?: boolean;
    size?: boolean;
    dashed?: boolean;
  };
};

const tools = new Map<ToolId, ToolDef>();

export function registerTool(def: ToolDef) {
  tools.set(def.id, def);
}
export function getTool(id: ToolId): ToolDef | undefined {
  return tools.get(id);
}
export function getAllTools(): ToolDef[] {
  return Array.from(tools.values());
}
export function getToolsByCategory(category: ToolCategory): ToolDef[] {
  return getAllTools().filter((t) => t.category === category);
}

// ---- Built-in tools ----
registerTool({ id: "select", label: "Select", icon: MousePointer2, category: "select", shortcut: "V", cursor: "default" });
registerTool({ id: "pan", label: "Move", icon: Hand, category: "select", shortcut: "H", cursor: "grab" });
registerTool({ id: "pen", label: "Pen", icon: Pen, category: "draw", shortcut: "P", settings: { color: true, size: true } });
registerTool({ id: "highlighter", label: "Highlighter", icon: Highlighter, category: "draw", settings: { color: true, size: true } });
registerTool({ id: "rainbow", label: "Rainbow", icon: Sparkles, category: "draw", settings: { size: true } });
registerTool({ id: "dashed", label: "Dashed", icon: Minus, category: "draw", settings: { color: true, size: true, dashed: true } });
registerTool({ id: "laser", label: "Laser", icon: Zap, category: "draw" });
registerTool({ id: "shape", label: "Shape", icon: Shapes, category: "insert", settings: { color: true, size: true } });
registerTool({ id: "text", label: "Text", icon: Type, category: "insert", shortcut: "T", settings: { color: true } });
registerTool({ id: "eraser-pixel", label: "Erase", icon: Eraser, category: "erase", shortcut: "E" });
registerTool({ id: "eraser-object", label: "Erase object", icon: Trash2, category: "erase" });
