/**
 * Feature Registry
 *
 * Every product surface (whiteboard tools, dashboard cards, AI actions,
 * new canvas object kinds, widgets) declares itself here. Toolbar,
 * WidgetsSheet, Dashboard, and AI Studio all read from the registry
 * instead of hardcoded lists — adding a feature becomes a single
 * `registerFeature(...)` call from its own module.
 */
import type { ComponentType } from "react";
import type { CanvasObjectKind, ToolId } from "@/lib/whiteboard/types";

export type FeatureCapability = "tool" | "widget" | "object" | "ai-action" | "dashboard";

export type AIAction = {
  id: string;
  label: string;
  /** Prompt template — `{{context}}` and `{{input}}` are substituted. */
  prompt: string;
  /** Optional: kind of object the AI should generate for this action. */
  produces?: CanvasObjectKind;
};

export type DashboardEntry = {
  id: string;
  label: string;
  description?: string;
  icon?: ComponentType<{ className?: string }>;
  href?: string;
};

export type FeatureModule = {
  id: string;
  name: string;
  description?: string;
  capabilities: FeatureCapability[];
  tools?: ToolId[];
  widgets?: string[];
  objects?: CanvasObjectKind[];
  aiActions?: AIAction[];
  dashboard?: DashboardEntry[];
};

const features = new Map<string, FeatureModule>();

export function registerFeature(f: FeatureModule) {
  features.set(f.id, f);
}
export function getFeature(id: string): FeatureModule | undefined {
  return features.get(id);
}
export function getAllFeatures(): FeatureModule[] {
  return Array.from(features.values());
}
export function getFeaturesWith(cap: FeatureCapability): FeatureModule[] {
  return getAllFeatures().filter((f) => f.capabilities.includes(cap));
}
export function getAllAIActions(): AIAction[] {
  return getAllFeatures().flatMap((f) => f.aiActions ?? []);
}
export function getAllDashboardEntries(): DashboardEntry[] {
  return getAllFeatures().flatMap((f) => f.dashboard ?? []);
}

// ---- Built-in feature modules ----

registerFeature({
  id: "whiteboard.core",
  name: "Whiteboard",
  description: "Core drawing, shapes, text, and selection.",
  capabilities: ["tool", "object"],
  tools: ["select", "pan", "pen", "highlighter", "rainbow", "dashed", "laser", "shape", "text", "eraser-pixel", "eraser-object"],
  objects: ["pen", "highlighter", "rainbow", "dashed", "shape", "text", "image", "sticky"],
});

registerFeature({
  id: "widgets.classroom",
  name: "Classroom widgets",
  description: "Timer, stopwatch, dice, scoreboard, calculator.",
  capabilities: ["widget"],
  widgets: ["timer", "stopwatch", "dice", "score", "calculator"],
});

registerFeature({
  id: "ai.assistant",
  name: "AI Assistant",
  description: "Generate questions, explain concepts, plan lessons.",
  capabilities: ["ai-action"],
  aiActions: [
    { id: "quiz", label: "Generate quiz", prompt: "Generate 5 quiz questions with answers on: {{input}}", produces: "quiz" },
    { id: "flashcards", label: "Generate flashcards", prompt: "Create 6 flashcards (front/back) for: {{input}}", produces: "flashcard" },
    { id: "roadmap", label: "Build roadmap", prompt: "Build a step-by-step roadmap for: {{input}}", produces: "roadmap" },
    { id: "timeline", label: "Draft timeline", prompt: "Draft a historical timeline for: {{input}}", produces: "timeline" },
    { id: "explain", label: "Explain", prompt: "Explain step-by-step: {{input}}" },
    { id: "lesson", label: "Lesson plan", prompt: "Create a short lesson plan for: {{input}}" },
  ],
});

registerFeature({
  id: "objects.learning",
  name: "Learning objects",
  description: "First-class canvas objects for flashcards, quizzes, roadmaps, and timelines.",
  capabilities: ["object"],
  objects: ["flashcard", "quiz", "roadmap", "timeline", "uml", "video", "audio"],
});
