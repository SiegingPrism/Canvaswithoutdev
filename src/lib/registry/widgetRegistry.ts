import type { ComponentType } from "react";
import {
  Calculator,
  Clock,
  Dices,
  Timer as TimerIcon,
  Trophy,
} from "lucide-react";
import {
  CalculatorWidget,
  DiceWidget,
  ScoreWidget,
  StopwatchWidget,
  TimerWidget,
} from "@/components/whiteboard/widgets";

export type WidgetCategory = "classroom" | "utility" | "media";

export type WidgetDef = {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  category: WidgetCategory;
  accentClass: string;
  component: ComponentType;
  defaultSize?: { w: number; h: number };
};

const widgets = new Map<string, WidgetDef>();

export function registerWidget(def: WidgetDef) {
  widgets.set(def.id, def);
}
export function getWidget(id: string): WidgetDef | undefined {
  return widgets.get(id);
}
export function getAllWidgets(): WidgetDef[] {
  return Array.from(widgets.values());
}
export function getWidgetsByCategory(c: WidgetCategory): WidgetDef[] {
  return getAllWidgets().filter((w) => w.category === c);
}

registerWidget({
  id: "timer",
  label: "Timer",
  icon: TimerIcon,
  category: "classroom",
  accentClass: "bg-orange-500/10 text-orange-500",
  component: TimerWidget,
});
registerWidget({
  id: "stopwatch",
  label: "Stopwatch",
  icon: Clock,
  category: "classroom",
  accentClass: "bg-blue-500/10 text-blue-500",
  component: StopwatchWidget,
});
registerWidget({
  id: "dice",
  label: "Dice",
  icon: Dices,
  category: "classroom",
  accentClass: "bg-purple-500/10 text-purple-500",
  component: DiceWidget,
});
registerWidget({
  id: "score",
  label: "Scoreboard",
  icon: Trophy,
  category: "classroom",
  accentClass: "bg-yellow-500/10 text-yellow-500",
  component: ScoreWidget,
});
registerWidget({
  id: "calculator",
  label: "Calculator",
  icon: Calculator,
  category: "utility",
  accentClass: "bg-emerald-500/10 text-emerald-500",
  component: CalculatorWidget,
});
