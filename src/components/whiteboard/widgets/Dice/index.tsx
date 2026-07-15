import { useState } from "react";
import { Button } from "@/components/ui/button";

const DICE_FACES = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

export function DiceWidget() {
  const [val, setVal] = useState(3);
  const [rolling, setRolling] = useState(false);
  function roll() {
    setRolling(true);
    let i = 0;
    const tick = setInterval(() => {
      setVal(1 + Math.floor(Math.random() * 6));
      if (++i > 8) {
        clearInterval(tick);
        setRolling(false);
      }
    }, 60);
  }
  return (
    <div className="space-y-3 text-center">
      <div className={`text-7xl leading-none transition-transform ${rolling ? "rotate-12" : ""}`}>
        {DICE_FACES[val - 1]}
      </div>
      <Button onClick={roll} disabled={rolling}>Roll</Button>
    </div>
  );
}
