import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { useWhiteboard } from "@/lib/whiteboard/store";
import type { ImageObject } from "@/lib/whiteboard/types";
import { toast } from "sonner";
import { Cloud, FileImage, FileText, Link2, Loader2, Plus, Search } from "lucide-react";

type CloudFile = {
  id: string;
  name: string;
  type: "image" | "pdf" | "link";
  url: string;
  subject: string;
  description?: string;
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Company cloud study library: browse approved study files and insert them
 * onto the canvas. The listing comes from /api/cloud (env-configurable), so
 * students only ever see company-curated study content.
 */
export function CloudFilesSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
}) {
  const addObject = useWhiteboard((s) => s.addObject);
  const pushHistory = useWhiteboard((s) => s.pushHistory);
  const camera = useWhiteboard((s) => s.camera);

  const [files, setFiles] = useState<CloudFile[] | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!open || files) return;
    fetch("/api/cloud")
      .then((r) => r.json())
      .then((data) => setFiles(Array.isArray(data.files) ? data.files : []))
      .catch(() => setError(true));
  }, [open, files]);

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const visible = (files ?? []).filter(
      (f) =>
        !q ||
        f.name.toLowerCase().includes(q) ||
        f.subject.toLowerCase().includes(q) ||
        (f.description ?? "").toLowerCase().includes(q),
    );
    const map = new Map<string, CloudFile[]>();
    for (const f of visible) {
      map.set(f.subject, [...(map.get(f.subject) ?? []), f]);
    }
    return Array.from(map.entries());
  }, [files, query]);

  function insert(f: CloudFile) {
    if (f.type === "image") {
      const img = new Image();
      img.onload = () => {
        const maxW = 420;
        const w = Math.min(maxW, img.width);
        const h = (img.height / img.width) * w;
        const cx = (window.innerWidth / 2 - camera.x) / camera.zoom;
        const cy = (window.innerHeight / 2 - camera.y) / camera.zoom;
        const obj: ImageObject = {
          id: uid(),
          kind: "image",
          x: cx - w / 2,
          y: cy - h / 2,
          w,
          h,
          src: f.url,
        };
        addObject(obj);
        pushHistory();
        toast.success(`Added "${f.name}" to the board`);
        onOpenChange(false);
      };
      img.onerror = () => toast.error("Couldn't load this file");
      img.src = f.url;
    } else {
      window.open(f.url, "_blank", "noopener,noreferrer");
    }
  }

  const Icon = ({ type }: { type: CloudFile["type"] }) =>
    type === "image" ? (
      <FileImage className="h-4 w-4 text-sky-500" />
    ) : type === "pdf" ? (
      <FileText className="h-4 w-4 text-red-500" />
    ) : (
      <Link2 className="h-4 w-4 text-emerald-500" />
    );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-md">
        <SheetHeader className="border-b p-4">
          <SheetTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5 text-primary" /> Study library
          </SheetTitle>
        </SheetHeader>

        <div className="border-b p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search study materials"
              className="pl-9"
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Curated study content from your organization's cloud. Insert files straight onto the
            board.
          </p>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-3">
          {error ? (
            <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              Couldn't reach the library. Check your connection.
            </div>
          ) : !files ? (
            <div className="grid place-items-center p-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : grouped.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              No study materials match.
            </div>
          ) : (
            grouped.map(([subject, items]) => (
              <div key={subject}>
                <div className="mb-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {subject}
                </div>
                <div className="space-y-1.5">
                  {items.map((f) => (
                    <div
                      key={f.id}
                      className="group flex items-center gap-3 rounded-xl border bg-card p-2.5 transition hover:border-primary"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted">
                        <Icon type={f.type} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{f.name}</div>
                        {f.description && (
                          <div className="truncate text-xs text-muted-foreground">
                            {f.description}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => insert(f)}
                        className="flex shrink-0 items-center gap-1 rounded-full bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground opacity-90 transition hover:opacity-100"
                        title={f.type === "image" ? "Insert onto board" : "Open"}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        {f.type === "image" ? "Insert" : "Open"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
