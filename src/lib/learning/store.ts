import { create } from "zustand";

// Learning Platform — PRD Doc 6 (§7 spaced repetition, §17 analytics)

const STORAGE_KEY = "learning.v1";

export type ReviewGrade = "again" | "hard" | "good" | "easy";

export type CardProgress = {
  /** SM-2 style ease factor */
  ease: number;
  /** current interval in days */
  intervalDays: number;
  /** next review due (ms epoch) */
  due: number;
  reps: number;
  lapses: number;
  correct: number;
  total: number;
  lastReviewed: number;
};

export type QuizAttempt = {
  id: string;
  boardId: string;
  boardTitle: string;
  total: number;
  correct: number;
  at: number;
};

export type DayActivity = {
  /** YYYY-MM-DD */
  date: string;
  cardsReviewed: number;
  cardsCorrect: number;
  quizQuestions: number;
  quizCorrect: number;
};

type PersistShape = {
  /** key = `${boardId}:${objectId}` */
  progress: Record<string, CardProgress>;
  attempts: QuizAttempt[];
  activity: Record<string, DayActivity>;
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function todayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function emptyPersist(): PersistShape {
  return { progress: {}, attempts: [], activity: {} };
}

function load(): PersistShape {
  if (typeof window === "undefined") return emptyPersist();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...emptyPersist(), ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return emptyPersist();
}

function save(s: PersistShape) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

const DAY_MS = 86_400_000;

/** SM-2 lite scheduling (PRD Doc 6 §7). */
export function schedule(prev: CardProgress | undefined, grade: ReviewGrade): CardProgress {
  const p: CardProgress = prev ?? {
    ease: 2.5,
    intervalDays: 0,
    due: 0,
    reps: 0,
    lapses: 0,
    correct: 0,
    total: 0,
    lastReviewed: 0,
  };
  let { ease, intervalDays, lapses } = p;
  const correct = grade === "again" ? p.correct : p.correct + 1;

  if (grade === "again") {
    lapses += 1;
    ease = Math.max(1.3, ease - 0.2);
    intervalDays = 0; // relearn today
  } else if (grade === "hard") {
    ease = Math.max(1.3, ease - 0.15);
    intervalDays = Math.max(1, intervalDays * 1.2 || 1);
  } else if (grade === "good") {
    intervalDays = intervalDays > 0 ? intervalDays * ease : 1;
  } else {
    ease = Math.min(3.0, ease + 0.15);
    intervalDays = (intervalDays > 0 ? intervalDays * ease : 2) * 1.3;
  }
  intervalDays = Math.min(365, intervalDays);

  return {
    ease,
    intervalDays,
    due: Date.now() + (grade === "again" ? 10 * 60_000 : intervalDays * DAY_MS),
    reps: p.reps + 1,
    lapses,
    correct,
    total: p.total + 1,
    lastReviewed: Date.now(),
  };
}

type Actions = {
  reviewCard: (cardKey: string, grade: ReviewGrade) => void;
  recordQuizAttempt: (a: Omit<QuizAttempt, "id" | "at">) => void;
  resetProgress: () => void;
};

export const useLearning = create<PersistShape & Actions>((set, get) => ({
  ...load(),

  reviewCard: (cardKey, grade) => {
    const s = get();
    const next = schedule(s.progress[cardKey], grade);
    const progress = { ...s.progress, [cardKey]: next };
    const day = todayKey();
    const prevDay = s.activity[day] ?? {
      date: day,
      cardsReviewed: 0,
      cardsCorrect: 0,
      quizQuestions: 0,
      quizCorrect: 0,
    };
    const activity = {
      ...s.activity,
      [day]: {
        ...prevDay,
        cardsReviewed: prevDay.cardsReviewed + 1,
        cardsCorrect: prevDay.cardsCorrect + (grade === "again" ? 0 : 1),
      },
    };
    const out = { progress, attempts: s.attempts, activity };
    save(out);
    set(out);
  },

  recordQuizAttempt: (a) => {
    const s = get();
    const attempt: QuizAttempt = { ...a, id: uid(), at: Date.now() };
    const attempts = [attempt, ...s.attempts].slice(0, 50);
    const day = todayKey();
    const prevDay = s.activity[day] ?? {
      date: day,
      cardsReviewed: 0,
      cardsCorrect: 0,
      quizQuestions: 0,
      quizCorrect: 0,
    };
    const activity = {
      ...s.activity,
      [day]: {
        ...prevDay,
        quizQuestions: prevDay.quizQuestions + a.total,
        quizCorrect: prevDay.quizCorrect + a.correct,
      },
    };
    const out = { progress: s.progress, attempts, activity };
    save(out);
    set(out);
  },

  resetProgress: () => {
    const out = emptyPersist();
    save(out);
    set(out);
  },
}));

/** Consecutive-day study streak ending today or yesterday (PRD Doc 6 §3). */
export function computeStreak(activity: Record<string, DayActivity>): number {
  let streak = 0;
  const d = new Date();
  // allow streak to survive if today has no activity yet
  if (!activity[todayKey(d)]) d.setDate(d.getDate() - 1);
  while (true) {
    const key = todayKey(d);
    const a = activity[key];
    if (!a || a.cardsReviewed + a.quizQuestions === 0) break;
    streak += 1;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export function isDue(p: CardProgress | undefined): boolean {
  return !p || p.due <= Date.now();
}
