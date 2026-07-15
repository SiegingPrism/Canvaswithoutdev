export type Point = { x: number; y: number; p?: number };

export type ToolId =
  | "select"
  | "pan"
  | "pen"
  | "highlighter"
  | "rainbow"
  | "dashed"
  | "laser"
  | "shape"
  | "eraser-pixel"
  | "eraser-object"
  | "text";

export type StrokeBase = {
  id: string;
  color: string;
  size: number;
  points: Point[];
};

export type PenStroke = StrokeBase & { kind: "pen" };
export type HighlighterStroke = StrokeBase & { kind: "highlighter" };
export type RainbowStroke = StrokeBase & { kind: "rainbow" };
export type DashedStroke = StrokeBase & { kind: "dashed" };

export type ShapeKind =
  | "rect"
  | "roundedRect"
  | "circle"
  | "ellipse"
  | "triangle"
  | "diamond"
  | "pentagon"
  | "hexagon"
  | "octagon"
  | "star"
  | "heart"
  | "line"
  | "arrow"
  | "doubleArrow"
  | "elbowArrow"
  | "process"
  | "decision"
  | "data"
  | "terminator"
  | "document"
  | "database"
  | "manualInput"
  | "connector"
  | "cloud"
  | "speech";

export type ShapeStroke = {
  id: string;
  kind: "shape";
  shape: ShapeKind;
  color: string;
  size: number;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation?: number;
  fill?: string;
};

export type TextObject = {
  id: string;
  kind: "text";
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  color: string;
  fontSize: number;
  bg?: string;
};
export type ImageObject = {
  id: string;
  kind: "image";
  x: number;
  y: number;
  w: number;
  h: number;
  src: string;
};
export type StickyNoteObject = {
  id: string;
  kind: "sticky";
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  color: string;
};

// ---- Feature objects (stubbed for AI Studio + future feature modules) ----
type BoxBase = { id: string; x: number; y: number; w: number; h: number };

export type FlashcardObject = BoxBase & {
  kind: "flashcard";
  front: string;
  back: string;
  color: string;
  flipped?: boolean;
};
export type QuizObject = BoxBase & {
  kind: "quiz";
  question: string;
  options: string[];
  answerIndex: number;
  revealed?: boolean;
};
export type RoadmapNodeObject = BoxBase & {
  kind: "roadmap";
  title: string;
  status: "todo" | "doing" | "done";
  color: string;
};
export type TimelineObject = BoxBase & {
  kind: "timeline";
  title: string;
  events: Array<{ date: string; label: string }>;
};
export type UMLObject = BoxBase & {
  kind: "uml";
  umlType: "class" | "actor" | "box";
  title: string;
  lines: string[];
};
export type VideoObject = BoxBase & { kind: "video"; src: string; title?: string };
export type AudioObject = BoxBase & { kind: "audio"; src: string; title?: string };

export type CanvasObject =
  | PenStroke
  | HighlighterStroke
  | RainbowStroke
  | DashedStroke
  | ShapeStroke
  | TextObject
  | ImageObject
  | StickyNoteObject
  | FlashcardObject
  | QuizObject
  | RoadmapNodeObject
  | TimelineObject
  | UMLObject
  | VideoObject
  | AudioObject;

export type CanvasObjectKind = CanvasObject["kind"];

export type BackgroundStyle = "blank" | "grid" | "dots" | "lined";
// Legacy union kept for backward compat with older saved boards.
export type LegacyBackground = "white" | "grid" | "dots" | "lined" | "dark";

export type Page = {
  id: string;
  objects: CanvasObject[];
  /** Legacy field, still honored for old boards. */
  background: LegacyBackground;
  /** New: independent style + color. */
  bgStyle?: BackgroundStyle;
  bgColor?: string;
};

export type WhiteboardState = {
  pages: Page[];
  activePageId: string;
  tool: ToolId;
  color: string;
  size: number;
  history: Page[][];
  historyIndex: number;
  selectedId: string | null;
  camera: { x: number; y: number; zoom: number };
  toolColors: Partial<Record<ToolId, string>>;
  recentColors: string[];
  favoriteColors: string[];
  autoRecognizeShape: boolean;
};

