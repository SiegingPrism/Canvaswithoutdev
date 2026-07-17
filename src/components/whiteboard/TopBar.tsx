import { useRef, useState } from "react";
import { useWhiteboard } from "@/lib/whiteboard/store";
import type { BackgroundStyle, ImageObject } from "@/lib/whiteboard/types";
import { TEMPLATES, type TemplateKey } from "@/lib/whiteboard/templates";
import { BACKGROUND_COLORS, BACKGROUND_STYLES, resolveBackground } from "./Canvas/background";

import {
  Upload,
  Download,
  QrCode,
  Undo2,
  Redo2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Grid3x3,
  Layout,
  MessageSquare,
  Package,
  ArrowLeft,
  Menu,
  LayoutTemplate,
  Play,
  Cloud,
  Settings,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Link, useNavigate } from "@tanstack/react-router";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import jsPDF from "jspdf";
import QRCode from "qrcode";
import { toast } from "sonner";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function TopBar({
  onOpenAI,
  onOpenWidgets,
  onPresent,
  onOpenCloud,
  boardTitle,
}: {
  onOpenAI: () => void;
  onOpenWidgets: () => void;
  onPresent?: () => void;
  onOpenCloud?: () => void;
  boardTitle?: string;
}) {
  const isMobile = useIsMobile();
  const {
    pages,
    activePageId,
    prevPage,
    nextPage,
    addPage,
    undo,
    redo,
    setBackgroundStyle,
    setBackgroundColor,
    addObject,
    pushHistory,
    createBoard,
    importBoard,
    applyTemplate,
  } = useWhiteboard();

  const navigate = useNavigate();

  const fileRef = useRef<HTMLInputElement>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrData, setQrData] = useState<string>("");

  const idx = pages.findIndex((p) => p.id === activePageId);
  const page = pages[idx];
  const pad2 = (n: number) => n.toString().padStart(2, "0");

  function exportPNG() {
    const c = document.querySelector<HTMLCanvasElement>("canvas");
    if (!c) return;
    const link = document.createElement("a");
    link.download = `whiteboard-${pad2(idx + 1)}.png`;
    link.href = c.toDataURL("image/png");
    link.click();
  }

  function exportPDF() {
    const c = document.querySelector<HTMLCanvasElement>("canvas");
    if (!c) return;
    const img = c.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: c.width > c.height ? "landscape" : "portrait",
      unit: "px",
      format: [c.width, c.height],
    });
    pdf.addImage(img, "PNG", 0, 0, c.width, c.height);
    pdf.save(`whiteboard-${pad2(idx + 1)}.pdf`);
  }

  async function shareQR() {
    const c = document.querySelector<HTMLCanvasElement>("canvas");
    if (!c) return;
    const dataUrl = c.toDataURL("image/png");
    const qr = await QRCode.toDataURL(window.location.href, { margin: 1, width: 320 });
    setQrData(qr);
    setQrOpen(true);
    // Also let user download PNG in same panel
    void dataUrl;
  }

  function exportJSON() {
    const state = useWhiteboard.getState();
    const data = JSON.stringify(
      { title: boardTitle ?? "Board", pages: state.pages, exportedAt: Date.now() },
      null,
      2,
    );
    const blob = new Blob([data], { type: "application/json" });
    const link = document.createElement("a");
    link.download = `${(boardTitle ?? "board").replace(/[^a-z0-9-_ ]/gi, "").trim() || "board"}.json`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function importFile(files: FileList | null) {
    if (!files?.length) return;
    const file = files[0];
    if (file.type === "application/json" || file.name.endsWith(".json")) {
      const jsonReader = new FileReader();
      jsonReader.onload = () => {
        try {
          const data = JSON.parse(jsonReader.result as string);
          if (!Array.isArray(data.pages)) throw new Error("Invalid board file");
          const id = importBoard({ title: data.title, pages: data.pages });
          toast.success("Board imported");
          navigate({ to: "/board/$boardId", params: { boardId: id } });
        } catch {
          toast.error("Couldn't read this board file");
        }
      };
      jsonReader.readAsText(file);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const maxW = 400;
        const w = Math.min(maxW, img.width);
        const h = (img.height / img.width) * w;
        const obj: ImageObject = {
          id: uid(),
          kind: "image",
          x: 100,
          y: 100,
          w,
          h,
          src,
        };
        addObject(obj);
        pushHistory();
        toast.success("Image added");
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  }

  const btn =
    "grid h-10 w-10 place-items-center rounded-lg text-foreground hover:bg-accent transition shrink-0";

  return (
    <div className="pointer-events-auto flex flex-nowrap overflow-x-auto whitespace-nowrap scrollbar-none items-center gap-1 rounded-2xl bg-card/95 p-1.5 shadow-lg ring-1 ring-border backdrop-blur max-w-[92vw]">
      <Link to="/" className={btn} title="Dashboard">
        <ArrowLeft className="h-5 w-5" />
      </Link>

      <Popover>
        <PopoverTrigger asChild>
          <button className={btn} title="Menu">
            <Menu className="h-5 w-5" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-2 max-h-[85vh] overflow-y-auto" align="start">
          {isMobile && (
            <div className="border-b pb-2 mb-2">
              <div className="mb-1 flex items-center gap-2 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Settings className="h-3.5 w-3.5" /> Actions & Tools
              </div>
              <div className="grid grid-cols-2 gap-1 px-1">
                {/* AI Assistant */}
                <button
                  onClick={() => onOpenAI()}
                  className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent text-left text-foreground"
                >
                  <MessageSquare className="h-4 w-4 text-primary" />
                  <span>AI Chat</span>
                </button>

                {/* Widgets */}
                <button
                  onClick={() => onOpenWidgets()}
                  className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent text-left text-foreground"
                >
                  <Package className="h-4 w-4" />
                  <span>Widgets</span>
                </button>

                {/* Study library (cloud files) */}
                {onOpenCloud && (
                  <button
                    onClick={() => onOpenCloud()}
                    className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent text-left text-foreground"
                  >
                    <Cloud className="h-4 w-4" />
                    <span>Cloud Files</span>
                  </button>
                )}

                {/* Present (fullscreen) */}
                {onPresent && (
                  <button
                    onClick={() => onPresent()}
                    className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent text-left text-foreground"
                  >
                    <Play className="h-4 w-4" />
                    <span>Present</span>
                  </button>
                )}

                {/* QR share */}
                <button
                  onClick={() => shareQR()}
                  className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent text-left text-foreground"
                >
                  <QrCode className="h-4 w-4" />
                  <span>QR Share</span>
                </button>

                {/* Import */}
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent text-left text-foreground"
                >
                  <Upload className="h-4 w-4" />
                  <span>Import</span>
                </button>
              </div>

              {/* Export options inline */}
              <div className="mt-2 border-t pt-2 px-1">
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-1">
                  Export Board
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    onClick={exportPNG}
                    className="rounded p-1 text-center text-xs hover:bg-accent border border-border"
                  >
                    PNG
                  </button>
                  <button
                    onClick={exportPDF}
                    className="rounded p-1 text-center text-xs hover:bg-accent border border-border"
                  >
                    PDF
                  </button>
                  <button
                    onClick={exportJSON}
                    className="rounded p-1 text-center text-xs hover:bg-accent border border-border"
                  >
                    JSON
                  </button>
                </div>
              </div>

              {/* Background options inline */}
              <div className="mt-2 border-t pt-2 px-1">
                <div className="mb-1.5 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-1">
                  <span>Background style</span>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {BACKGROUND_STYLES.map((s) => {
                    const { style } = resolveBackground(page);
                    return (
                      <button
                        key={s}
                        onClick={() => setBackgroundStyle(s as BackgroundStyle)}
                        className={`rounded p-1 text-center text-[10px] capitalize border ${
                          style === s ? "border-primary bg-primary/10" : "border-border hover:bg-accent"
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <div className="mb-1 flex items-center gap-2 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <LayoutTemplate className="h-3.5 w-3.5" /> New from template
          </div>
          <div className="max-h-72 overflow-y-auto">
            {TEMPLATES.map((t) => (
              <button
                key={t.key}
                onClick={() => {
                  applyTemplate(t.key as TemplateKey);
                  toast.success(`Applied ${t.title} template`);
                }}
                className="flex w-full items-start gap-2 rounded px-2 py-1.5 text-left hover:bg-accent"
              >
                <span className="text-lg leading-none">{t.emoji}</span>
                <div className="min-w-0">
                  <div className="text-sm font-medium">{t.title}</div>
                  <div className="truncate text-xs text-muted-foreground">{t.description}</div>
                </div>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {boardTitle && (
        <div
          className="hidden max-w-[180px] truncate px-2 text-sm font-medium sm:block"
          title={boardTitle}
        >
          {boardTitle}
        </div>
      )}
      <div className="mx-1 h-6 w-px bg-border shrink-0" />

      <input
        ref={fileRef}
        type="file"
        accept="image/*,application/json,.json"
        className="hidden"
        onChange={(e) => importFile(e.target.files)}
      />
      <button className={cn(btn, "hidden lg:grid")} title="Import" onClick={() => fileRef.current?.click()}>
        <Upload className="h-5 w-5" />
      </button>

      <Popover>
        <PopoverTrigger asChild>
          <button className={cn(btn, "hidden lg:grid")} title="Export">
            <Download className="h-5 w-5" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-40 p-1">
          <button
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent"
            onClick={exportPNG}
          >
            <Download className="h-4 w-4" /> PNG image
          </button>
          <button
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent"
            onClick={exportPDF}
          >
            <Download className="h-4 w-4" /> PDF file
          </button>
          <button
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent"
            onClick={exportJSON}
          >
            <Download className="h-4 w-4" /> JSON board
          </button>
        </PopoverContent>
      </Popover>

      <button className={cn(btn, "hidden lg:grid")} title="QR share" onClick={shareQR}>
        <QrCode className="h-5 w-5" />
      </button>

      <div className="mx-1 h-6 w-px bg-border shrink-0 hidden lg:block" />

      <button className={btn} title="Undo" onClick={undo}>
        <Undo2 className="h-5 w-5" />
      </button>
      <button className={btn} title="Redo" onClick={redo}>
        <Redo2 className="h-5 w-5" />
      </button>

      <div className="mx-1 h-6 w-px bg-border shrink-0" />

      <button className={btn} onClick={prevPage} title="Previous">
        <ChevronLeft className="h-5 w-5" />
      </button>
      <div className="min-w-14 rounded px-2 text-center text-sm font-medium tabular-nums text-foreground shrink-0">
        {pad2(idx + 1)}/{pad2(pages.length)}
      </div>
      <button className={btn} onClick={nextPage} title="Next">
        <ChevronRight className="h-5 w-5" />
      </button>
      <button className={btn} onClick={addPage} title="Add page">
        <Plus className="h-5 w-5" />
      </button>

      <div className="mx-1 h-6 w-px bg-border shrink-0 hidden lg:block" />

      <Popover>
        <PopoverTrigger asChild>
          <button className={cn(btn, "hidden lg:grid")} title="Background">
            <Grid3x3 className="h-5 w-5" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 space-y-3">
          {(() => {
            const { style, color } = resolveBackground(page);
            return (
              <>
                <div>
                  <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Layout className="h-3.5 w-3.5" /> Style
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {BACKGROUND_STYLES.map((s) => (
                      <button
                        key={s}
                        onClick={() => setBackgroundStyle(s as BackgroundStyle)}
                        className={`rounded-md border p-1.5 text-xs capitalize transition hover:bg-accent ${
                          style === s ? "border-primary bg-primary/10" : "border-border"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Color
                  </div>
                  <div className="grid grid-cols-7 gap-1.5">
                    {BACKGROUND_COLORS.map((c) => (
                      <button
                        key={c.name}
                        title={c.name}
                        onClick={() => setBackgroundColor(c.hex)}
                        className={`h-7 w-7 rounded-full ring-2 transition ${
                          color.toLowerCase() === c.hex.toLowerCase()
                            ? "ring-primary"
                            : "ring-border"
                        }`}
                        style={{ backgroundColor: c.hex }}
                      />
                    ))}
                  </div>
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="mt-2 h-8 w-full cursor-pointer rounded"
                  />
                </div>
              </>
            );
          })()}
        </PopoverContent>
      </Popover>

      {onOpenCloud && (
        <button className={cn(btn, "hidden lg:grid")} onClick={onOpenCloud} title="Study library (cloud files)">
          <Cloud className="h-5 w-5" />
        </button>
      )}
      {onPresent && (
        <button className={cn(btn, "hidden lg:grid")} onClick={onPresent} title="Present (fullscreen)">
          <Play className="h-5 w-5" />
        </button>
      )}
      <button className={cn(btn, "hidden lg:grid")} onClick={onOpenWidgets} title="Widgets">
        <Package className="h-5 w-5" />
      </button>
      <button className={cn(btn, "hidden lg:grid")} onClick={onOpenAI} title="AI Assistant">
        <MessageSquare className="h-5 w-5 text-primary" />
      </button>

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Scan to open this board</DialogTitle>
          </DialogHeader>
          {qrData && (
            <div className="flex flex-col items-center gap-3">
              <img src={qrData} alt="QR code" className="rounded-lg border" />
              <p className="text-xs text-muted-foreground text-center">
                Scan with a mobile device to open this whiteboard URL. Use Export to save the notes
                as image or PDF.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
