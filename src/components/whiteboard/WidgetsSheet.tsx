import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ImagePlus, Ruler, StickyNote, Table as TableIcon } from "lucide-react";
import { useWhiteboard } from "@/lib/whiteboard/store";
import type { StickyNoteObject } from "@/lib/whiteboard/types";
import { getAllWidgets, type WidgetDef } from "@/lib/registry/widgetRegistry";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

/** Widget kinds are just registry ids now. */
export type WidgetKind = string;

export function WidgetsSheet({
  open,
  onOpenChange,
  onLaunch,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  onLaunch: (kind: WidgetKind) => void;
}) {
  const { addObject, pushHistory } = useWhiteboard();
  const widgets = getAllWidgets();
  const classroom = widgets.filter((w) => w.category === "classroom" || w.category === "utility");

  function addSticky() {
    const colors = ["#fef08a", "#bbf7d0", "#bae6fd", "#fbcfe8", "#fed7aa"];
    const s: StickyNoteObject = {
      id: uid(),
      kind: "sticky",
      x: 200 + Math.random() * 200,
      y: 200 + Math.random() * 200,
      w: 180,
      h: 180,
      text: "New note",
      color: colors[Math.floor(Math.random() * colors.length)],
    };
    addObject(s);
    pushHistory();
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Widgets</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-6 overflow-y-auto pr-2">
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Classroom
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {classroom.map((w: WidgetDef) => {
                const Icon = w.icon;
                return (
                  <button
                    key={w.id}
                    onClick={() => {
                      onLaunch(w.id);
                      onOpenChange(false);
                    }}
                    className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-3 text-center transition hover:bg-accent"
                  >
                    <span className={`grid h-10 w-10 place-items-center rounded-lg ${w.accentClass}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="text-xs font-medium">{w.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Canvas
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={addSticky}
                className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-3 text-center transition hover:bg-accent"
              >
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-yellow-400/20 text-yellow-500">
                  <StickyNote className="h-5 w-5" />
                </span>
                <span className="text-xs font-medium">Sticky note</span>
              </button>
              <DisabledCard icon={ImagePlus} label="Image search" />
              <DisabledCard icon={Ruler} label="Ruler" />
              <DisabledCard icon={TableIcon} label="Table" />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              New object types (Flashcard, Quiz, Roadmap, Timeline, UML, Video, Audio) are registered
              and can be generated via AI Studio.
            </p>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DisabledCard({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border p-3 text-center opacity-50">
      <span className="grid h-10 w-10 place-items-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="h-5 w-5" />
      </span>
      <span className="text-xs">{label}</span>
    </div>
  );
}

export function useWidgetLauncher() {
  const [openWidgets, setOpenWidgets] = useState<Array<{ id: string; kind: WidgetKind; x: number; y: number }>>([]);
  function launch(kind: WidgetKind) {
    setOpenWidgets((w) => [
      ...w,
      { id: uid(), kind, x: 120 + w.length * 30, y: 120 + w.length * 30 },
    ]);
  }
  function close(id: string) {
    setOpenWidgets((w) => w.filter((x) => x.id !== id));
  }
  return { openWidgets, launch, close };
}
