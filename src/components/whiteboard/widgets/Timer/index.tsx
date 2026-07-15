import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Pause, Play, Plus, Minus, RotateCcw } from "lucide-react";

export function TimerWidget() {
  const [total, setTotal] = useState(60);
  const [remaining, setRemaining] = useState(60);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          setRunning(false);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [running]);

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  return (
    <div className="space-y-3 text-center">
      <div className="text-5xl font-bold tabular-nums">{mm}:{ss}</div>
      <div className="flex items-center justify-center gap-1">
        <Button size="icon" variant="ghost" onClick={() => { setTotal((t) => Math.max(10, t - 30)); setRemaining((r) => Math.max(0, r - 30)); }}>
          <Minus className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="default" onClick={() => setRunning((r) => !r)}>
          {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <Button size="icon" variant="ghost" onClick={() => { setRunning(false); setRemaining(total); }}>
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={() => { setTotal((t) => t + 30); setRemaining((r) => r + 30); }}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
