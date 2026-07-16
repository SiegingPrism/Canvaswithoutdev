import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Sparkles,
  Send,
  Wand2,
  HelpCircle,
  BookOpen,
  Lightbulb,
  Loader2,
  Layers,
  ListChecks,
  Calendar,
  Boxes,
  Route,
  Network,
  History,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useWhiteboard } from "@/lib/whiteboard/store";
import { generateLearningObjects, type AIObjectKind } from "@/lib/whiteboard/aiObjects.functions";
import type { CanvasObject, ShapeStroke, StickyNoteObject } from "@/lib/whiteboard/types";

type Msg = { id: string; role: "user" | "assistant"; content: string };

const QUICK = [
  {
    label: "Generate Q&A",
    icon: HelpCircle,
    prompt: "Generate 5 quiz questions with answers on: ",
  },
  { label: "Explain", icon: BookOpen, prompt: "Explain step-by-step: " },
  { label: "Lesson plan", icon: Wand2, prompt: "Create a short lesson plan for: " },
  { label: "Ideas", icon: Lightbulb, prompt: "Brainstorm classroom activities about: " },
];

const STUDIO: { kind: AIObjectKind; label: string; icon: typeof Layers; hint: string }[] = [
  { kind: "flashcard", label: "Flashcards", icon: Layers, hint: "6 study cards" },
  { kind: "quiz", label: "Quiz", icon: ListChecks, hint: "5 MCQs" },
  { kind: "timeline", label: "Timeline", icon: Calendar, hint: "Events" },
  { kind: "uml", label: "UML", icon: Boxes, hint: "Class diagram" },
  { kind: "roadmap", label: "Roadmap", icon: Route, hint: "6 steps" },
  { kind: "mindmap", label: "Mind map", icon: Network, hint: "Branches & nodes" },
];

type ContextScope = "none" | "selection" | "page";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function AISheet({
  open,
  onOpenChange,
  contextText,
  pageContext,
  boardId,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  contextText?: string;
  /** Text of the whole active page (AI context engine, PRD Doc 5 §10) */
  pageContext?: string;
  boardId?: string;
}) {
  const addRecentAI = useWhiteboard((s) => s.addRecentAI);
  const clearRecentAI = useWhiteboard((s) => s.clearRecentAI);
  const recentAI = useWhiteboard((s) => s.recentAI);
  const addObjects = useWhiteboard((s) => s.addObjects);
  const pushHistory = useWhiteboard((s) => s.pushHistory);
  const camera = useWhiteboard((s) => s.camera);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [studioTopic, setStudioTopic] = useState("");
  const [studioBusy, setStudioBusy] = useState<AIObjectKind | null>(null);
  const [scope, setScope] = useState<ContextScope>(contextText ? "selection" : "none");
  const [tab, setTab] = useState("chat");
  const scrollRef = useRef<HTMLDivElement>(null);

  const scopedContext =
    scope === "selection" ? contextText : scope === "page" ? pageContext : undefined;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    const clean = text.trim();
    if (!clean || loading) return;
    const userMsg: Msg = { id: uid(), role: "user", content: clean };
    const assistantMsg: Msg = { id: uid(), role: "assistant", content: "" };
    const next = [...messages, userMsg];
    setMessages([...next, assistantMsg]);
    setInput("");
    setLoading(true);

    try {
      const uiMessages = next.map((m) => ({
        id: m.id,
        role: m.role,
        parts: [{ type: "text", text: m.content }],
      }));
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: uiMessages,
          system: scopedContext
            ? `You are a whiteboard classroom AI. Use this board content as primary context:\n"""${scopedContext}"""`
            : undefined,
        }),
      });
      if (!res.ok || !res.body) throw new Error(`Chat failed: ${res.status}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const evt = JSON.parse(payload);
            if (evt.type === "text-delta" && typeof evt.delta === "string") acc += evt.delta;
            else if (evt.type === "text" && typeof evt.text === "string") acc += evt.text;
          } catch {
            /* ignore */
          }
        }
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { ...copy[copy.length - 1], content: acc };
          return copy;
        });
      }
      if (acc.trim()) addRecentAI({ prompt: clean, response: acc, boardId: boardId ?? null });
    } catch (e) {
      console.error(e);
      toast.error("AI request failed");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }

  function centerWorld() {
    // Center of the viewport in world coords.
    const cx = (typeof window !== "undefined" ? window.innerWidth / 2 : 400) - camera.x;
    const cy = (typeof window !== "undefined" ? window.innerHeight / 2 : 300) - camera.y;
    return { x: cx / camera.zoom, y: cy / camera.zoom };
  }

  function layoutObjects(count: number, w: number, h: number, cols: number) {
    const gap = 16;
    const total = { w: cols * w + (cols - 1) * gap };
    const center = centerWorld();
    const startX = center.x - total.w / 2;
    const startY = center.y - h / 2 - 60;
    return Array.from({ length: count }, (_, i) => {
      const c = i % cols;
      const r = Math.floor(i / cols);
      return { x: startX + c * (w + gap), y: startY + r * (h + gap) };
    });
  }

  async function runStudio(kind: AIObjectKind) {
    const topic = studioTopic.trim();
    if (!topic) {
      toast.error("Enter a topic first");
      return;
    }
    if (studioBusy) return;
    setStudioBusy(kind);
    try {
      const res = await generateLearningObjects({
        data: { kind, topic, context: scopedContext || undefined },
      });
      const objs = buildObjectsFromAI(kind, res.output, layoutObjects, centerWorld);
      if (!objs.length) throw new Error("No objects generated");
      addObjects(objs);
      pushHistory();
      addRecentAI({
        prompt: `[${kind}] ${topic}`,
        response: `Added ${objs.length} ${kind}${objs.length > 1 ? "s" : ""} to the board.`,
        boardId: boardId ?? null,
      });
      toast.success(`Added ${objs.length} ${kind}${objs.length > 1 ? "s" : ""}`);
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setStudioBusy(null);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-md">
        <SheetHeader className="border-b p-4">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> AI Assistant
          </SheetTitle>
        </SheetHeader>

        <Tabs value={tab} onValueChange={setTab} className="flex flex-1 flex-col overflow-hidden">
          <TabsList className="mx-4 mt-3 grid w-auto grid-cols-3">
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="studio">AI Studio</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          {/* Context scope (PRD Doc 5 §10) */}
          <div className="mx-4 mt-2 flex items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Context
            </span>
            {(
              [
                ["none", "None"],
                ["selection", "Selection"],
                ["page", "Whole page"],
              ] as const
            ).map(([value, label]) => {
              const disabled =
                (value === "selection" && !contextText) || (value === "page" && !pageContext);
              return (
                <button
                  key={value}
                  disabled={disabled}
                  onClick={() => setScope(value)}
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition disabled:opacity-40 ${
                    scope === value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <TabsContent
            value="chat"
            className="flex flex-1 flex-col overflow-hidden data-[state=inactive]:hidden"
          >
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.length === 0 && (
                <div className="rounded-xl border border-dashed border-border p-4 text-center">
                  <Sparkles className="mx-auto h-8 w-8 text-primary" />
                  <p className="mt-2 text-sm font-medium">Ask me anything</p>
                  <p className="text-xs text-muted-foreground">
                    Generate questions, explain concepts, plan lessons, or brainstorm activities.
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {QUICK.map((q) => (
                      <button
                        key={q.label}
                        className="flex items-center gap-2 rounded-lg border border-border px-2 py-2 text-left text-xs transition hover:bg-accent"
                        onClick={() => setInput(q.prompt)}
                      >
                        <q.icon className="h-3.5 w-3.5 text-primary" />
                        {q.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m) => (
                <div key={m.id} className={m.role === "user" ? "flex justify-end" : ""}>
                  <div
                    className={
                      m.role === "user"
                        ? "max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground"
                        : "max-w-[92%] whitespace-pre-wrap text-sm text-foreground"
                    }
                  >
                    {m.content ||
                      (loading && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ))}
                  </div>
                </div>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex items-end gap-2 border-t p-3"
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                rows={2}
                placeholder="Ask me anything…"
                className="flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <Button size="icon" type="submit" disabled={loading || !input.trim()}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </TabsContent>

          <TabsContent
            value="studio"
            className="flex flex-1 flex-col overflow-y-auto data-[state=inactive]:hidden"
          >
            <div className="space-y-4 p-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Topic</label>
                <textarea
                  value={studioTopic}
                  onChange={(e) => setStudioTopic(e.target.value)}
                  rows={3}
                  placeholder="e.g. Photosynthesis, WWII causes, Binary search trees…"
                  className="mt-1 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  AI generates interactive objects and drops them onto the board. Double-click cards
                  to flip / reveal / cycle status.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {STUDIO.map(({ kind, label, icon: Icon, hint }) => (
                  <button
                    key={kind}
                    disabled={!!studioBusy || !studioTopic.trim()}
                    onClick={() => runStudio(kind)}
                    className="flex flex-col items-start gap-1 rounded-xl border border-border bg-card px-3 py-3 text-left transition hover:border-primary hover:bg-accent disabled:opacity-50"
                  >
                    <div className="flex w-full items-center justify-between">
                      <Icon className="h-4 w-4 text-primary" />
                      {studioBusy === kind && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    </div>
                    <div className="text-sm font-medium">{label}</div>
                    <div className="text-xs text-muted-foreground">{hint}</div>
                  </button>
                ))}
              </div>
              {contextText && (
                <div className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
                  <span className="font-medium">Selected on board:</span>{" "}
                  {contextText.slice(0, 120)}
                  {contextText.length > 120 ? "…" : ""}
                  <button
                    className="ml-2 text-primary hover:underline"
                    onClick={() => setStudioTopic(contextText)}
                  >
                    use as topic
                  </button>
                </div>
              )}
            </div>
          </TabsContent>

          {/* AI history (PRD Doc 5 §16) */}
          <TabsContent
            value="history"
            className="flex flex-1 flex-col overflow-y-auto data-[state=inactive]:hidden"
          >
            <div className="space-y-2 p-4">
              {recentAI.length === 0 ? (
                <div className="rounded-xl border border-dashed p-6 text-center">
                  <History className="mx-auto h-6 w-6 text-muted-foreground" />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Your prompts and AI generations will appear here.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex justify-end">
                    <button
                      onClick={clearRecentAI}
                      className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" /> Clear history
                    </button>
                  </div>
                  {recentAI.map((r) => (
                    <div key={r.id} className="rounded-xl border bg-card p-3">
                      <div className="text-xs font-medium">{r.prompt}</div>
                      <div className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                        {r.response}
                      </div>
                      <button
                        onClick={() => {
                          setInput(r.prompt.replace(/^\[[a-z]+\]\s*/i, ""));
                          setTab("chat");
                        }}
                        className="mt-2 flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                      >
                        <RotateCcw className="h-3 w-3" /> Re-run in chat
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

// ---------- Build canvas objects from AI structured output ----------

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

type LayoutFn = (count: number, w: number, h: number, cols: number) => { x: number; y: number }[];

function buildObjectsFromAI(
  kind: AIObjectKind,
  output: unknown,
  layout: LayoutFn,
  centerWorld: () => { x: number; y: number },
): CanvasObject[] {
  const out = output as {
    items?: unknown[];
    events?: { date: string; label: string }[];
    lines?: string[];
    title?: string;
    umlType?: "class" | "actor" | "box";
    branches?: { label: string; children: string[] }[];
  };

  if (kind === "mindmap") {
    return buildMindMap(out.title ?? "Mind map", out.branches ?? [], centerWorld());
  }

  if (kind === "flashcard") {
    const items = (out.items ?? []) as { front: string; back: string }[];
    const positions = layout(items.length, 200, 140, 3);
    return items.map((it, i) => ({
      id: newId(),
      kind: "flashcard",
      x: positions[i].x,
      y: positions[i].y,
      w: 200,
      h: 140,
      front: it.front,
      back: it.back,
      color: "#fef3c7",
    }));
  }
  if (kind === "quiz") {
    const items = (out.items ?? []) as {
      question: string;
      options: string[];
      answerIndex: number;
    }[];
    const positions = layout(items.length, 280, 170, 2);
    return items.map((it, i) => ({
      id: newId(),
      kind: "quiz",
      x: positions[i].x,
      y: positions[i].y,
      w: 280,
      h: 170,
      question: it.question,
      options: it.options.slice(0, 4),
      answerIndex: Math.max(0, Math.min(3, it.answerIndex)),
    }));
  }
  if (kind === "roadmap") {
    const items = (out.items ?? []) as { title: string; status: "todo" | "doing" | "done" }[];
    const positions = layout(items.length, 200, 90, 3);
    return items.map((it, i) => ({
      id: newId(),
      kind: "roadmap",
      x: positions[i].x,
      y: positions[i].y,
      w: 200,
      h: 90,
      title: it.title,
      status: it.status,
      color: "#f1f5f9",
    }));
  }
  if (kind === "timeline") {
    const [pos] = layout(1, 420, 260, 1);
    return [
      {
        id: newId(),
        kind: "timeline",
        x: pos.x,
        y: pos.y,
        w: 420,
        h: Math.max(120, 60 + (out.events?.length ?? 0) * 22),
        title: out.title ?? "Timeline",
        events: out.events ?? [],
      },
    ];
  }
  if (kind === "uml") {
    const [pos] = layout(1, 340, 240, 1);
    return [
      {
        id: newId(),
        kind: "uml",
        x: pos.x,
        y: pos.y,
        w: 340,
        h: Math.max(120, 60 + (out.lines?.length ?? 0) * 20),
        umlType: out.umlType ?? "class",
        title: out.title ?? "Class",
        lines: out.lines ?? [],
      },
    ];
  }
  return [];
}

/**
 * Mind map (PRD Doc 5 §12): editable sticky-note nodes connected with line
 * shapes, laid out radially around a central topic node.
 */
function buildMindMap(
  title: string,
  branches: { label: string; children: string[] }[],
  center: { x: number; y: number },
): CanvasObject[] {
  const lines: ShapeStroke[] = [];
  const nodes: StickyNoteObject[] = [];
  const CW = 190;
  const CH = 64;
  const BW = 150;
  const BH = 52;
  const KW = 130;
  const KH = 44;

  const centerNode: StickyNoteObject = {
    id: newId(),
    kind: "sticky",
    x: center.x - CW / 2,
    y: center.y - CH / 2,
    w: CW,
    h: CH,
    text: title,
    color: "#fde68a",
  };

  const branchColors = ["#bae6fd", "#bbf7d0", "#fecaca", "#e9d5ff", "#fed7aa", "#c7d2fe"];
  const n = Math.max(1, branches.length);
  branches.forEach((branch, bi) => {
    const angle = (bi / n) * Math.PI * 2 - Math.PI / 2;
    const bx = center.x + Math.cos(angle) * 300;
    const by = center.y + Math.sin(angle) * 220;
    const branchNode: StickyNoteObject = {
      id: newId(),
      kind: "sticky",
      x: bx - BW / 2,
      y: by - BH / 2,
      w: BW,
      h: BH,
      text: branch.label,
      color: branchColors[bi % branchColors.length],
    };
    lines.push(connector(center.x, center.y, bx, by));

    const kids = branch.children.slice(0, 4);
    kids.forEach((child, ci) => {
      const spread = Math.PI / 5;
      const childAngle = angle + (ci - (kids.length - 1) / 2) * spread * 0.8;
      const cx = center.x + Math.cos(childAngle) * 520;
      const cy = center.y + Math.sin(childAngle) * 380;
      nodes.push({
        id: newId(),
        kind: "sticky",
        x: cx - KW / 2,
        y: cy - KH / 2,
        w: KW,
        h: KH,
        text: child,
        color: "#f8fafc",
      });
      lines.push(connector(bx, by, cx, cy));
    });
    nodes.push(branchNode);
  });

  // Lines first so nodes render on top.
  return [...lines, ...nodes, centerNode];
}

function connector(x1: number, y1: number, x2: number, y2: number): ShapeStroke {
  return {
    id: newId(),
    kind: "shape",
    shape: "line",
    color: "#94a3b8",
    size: 2,
    x: x1,
    y: y1,
    w: x2 - x1,
    h: y2 - y1,
  };
}
