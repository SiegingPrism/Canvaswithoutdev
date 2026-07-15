// Thin re-exports so Canvas modules can stay decoupled from the store shape.
// Actual undo/redo/pushHistory live in the whiteboard zustand store; this file
// exists as an extension point (e.g. for future collaborative op-history).
export { useWhiteboard } from "@/lib/whiteboard/store";
