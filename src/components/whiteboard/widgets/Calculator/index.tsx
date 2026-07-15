import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CalculatorWidget() {
  const [expr, setExpr] = useState("");
  const [result, setResult] = useState("");
  function press(k: string) {
    if (k === "=") {
      try {
        // eslint-disable-next-line no-new-func
        const val = Function(`"use strict"; return (${expr.replace(/×/g, "*").replace(/÷/g, "/")})`)();
        setResult(String(val));
      } catch {
        setResult("Error");
      }
    } else if (k === "C") {
      setExpr("");
      setResult("");
    } else if (k === "⌫") {
      setExpr((e) => e.slice(0, -1));
    } else {
      setExpr((e) => e + k);
    }
  }
  const keys = ["C", "⌫", "(", ")", "7", "8", "9", "÷", "4", "5", "6", "×", "1", "2", "3", "-", "0", ".", "=", "+"];
  return (
    <div className="w-56 space-y-2">
      <div className="rounded-lg bg-muted p-2 text-right">
        <div className="text-xs text-muted-foreground truncate">{expr || "0"}</div>
        <div className="text-2xl font-bold tabular-nums">{result || "0"}</div>
      </div>
      <div className="grid grid-cols-4 gap-1">
        {keys.map((k) => (
          <Button
            key={k}
            variant={k === "=" ? "default" : "ghost"}
            className="h-10"
            onClick={() => press(k)}
          >
            {k}
          </Button>
        ))}
      </div>
    </div>
  );
}
