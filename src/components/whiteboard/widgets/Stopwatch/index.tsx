import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Pause, Play, RotateCcw } from "lucide-react";

export function StopwatchWidget() {
  const [ms, setMs] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const start = Date.now() - ms;
    const t = setInterval(() => setMs(Date.now() - start), 50);
    return () => clearInterval(t);
  }, [running, ms]);

  const total = Math.floor(ms / 1000);
  const mm = String(Math.floor(total / 60)).padStart(2, "0");
  const ss = String(total % 60).padStart(2, "0");
  const cs = String(Math.floor((ms % 1000) / 10)).padStart(2, "0");

  return (
    <div className="space-y-3 text-center">
      <div className="text-4xl font-bold tabular-nums">
        {mm}:{ss}<span className="text-2xl text-muted-foreground">.{cs}</span>
      </div>
      <div className="flex items-center justify-center gap-1">
        <Button size="icon" variant="default" onClick={() => setRunning((r) => !r)}>
          {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <Button size="icon" variant="ghost" onClick={() => { setRunning(false); setMs(0); }}>
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
