import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Minus, Plus } from "lucide-react";

export function ScoreWidget() {
  const [teams, setTeams] = useState([
    { name: "Team A", score: 0 },
    { name: "Team B", score: 0 },
  ]);
  return (
    <div className="space-y-2">
      {teams.map((t, i) => (
        <div key={i} className="flex items-center gap-2 rounded-lg bg-muted/60 p-2">
          <input
            className="flex-1 bg-transparent text-sm font-medium outline-none"
            value={t.name}
            onChange={(e) => setTeams(teams.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
          />
          <Button size="icon" variant="ghost" onClick={() => setTeams(teams.map((x, j) => j === i ? { ...x, score: Math.max(0, x.score - 1) } : x))}>
            <Minus className="h-4 w-4" />
          </Button>
          <div className="w-10 text-center text-lg font-bold tabular-nums">{t.score}</div>
          <Button size="icon" variant="ghost" onClick={() => setTeams(teams.map((x, j) => j === i ? { ...x, score: x.score + 1 } : x))}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        size="sm"
        variant="ghost"
        className="w-full"
        onClick={() => setTeams([...teams, { name: `Team ${String.fromCharCode(65 + teams.length)}`, score: 0 }])}
      >
        <Plus className="h-4 w-4" /> Add team
      </Button>
    </div>
  );
}
