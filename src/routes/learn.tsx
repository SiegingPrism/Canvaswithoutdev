import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useWhiteboard } from "@/lib/whiteboard/store";
import { computeStreak, isDue, useLearning, type ReviewGrade } from "@/lib/learning/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useNotes } from "@/lib/notes/store";
import { generateStudyPlan, type StudyPlan } from "@/lib/ai/studyPlan.functions";
import { toast } from "sonner";
import {
  ArrowLeft,
  Flame,
  Layers,
  ListChecks,
  GraduationCap,
  BarChart3,
  Play,
  X,
  Check,
  RotateCcw,
  Sparkles,
  CalendarClock,
  Loader2,
  NotebookPen,
} from "lucide-react";

export const Route = createFileRoute("/learn")({
  head: () => ({
    meta: [
      { title: "Learn — Slate" },
      {
        name: "description",
        content: "Study flashcards with spaced repetition, take quizzes, track progress.",
      },
    ],
  }),
  component: LearnPage,
});

type Card = { key: string; front: string; back: string };
type Question = { question: string; options: string[]; answerIndex: number };
type Deck = { boardId: string; title: string; cards: Card[]; due: number };
type QuizSet = { boardId: string; title: string; questions: Question[] };

function LearnPage() {
  const navigate = useNavigate();
  const boards = useWhiteboard((s) => s.boards);
  const boardOrder = useWhiteboard((s) => s.boardOrder);
  const boardData = useWhiteboard((s) => s.boardData);
  const progress = useLearning((s) => s.progress);
  const attempts = useLearning((s) => s.attempts);
  const activity = useLearning((s) => s.activity);

  const [studying, setStudying] = useState<Deck | null>(null);
  const [quizzing, setQuizzing] = useState<QuizSet | null>(null);

  // Revision forecast (PRD Doc 12/16): due cards over the next 7 days.
  const forecast = useMemo(() => {
    const days = Array.from({ length: 7 }, () => 0);
    const now = Date.now();
    const DAY = 86_400_000;
    for (const id of boardOrder) {
      const meta = boards[id];
      const data = boardData[id];
      if (!meta || meta.archived || !data) continue;
      for (const page of data.pages) {
        for (const o of page.objects) {
          if (o.kind !== "flashcard") continue;
          const p = progress[`${id}:${o.id}`];
          const due = p?.due ?? now;
          const offset = Math.max(0, Math.floor((due - now) / DAY));
          if (offset < 7) days[offset] += 1;
        }
      }
    }
    return days;
  }, [boards, boardOrder, boardData, progress]);

  const { decks, quizzes } = useMemo(() => {
    const decks: Deck[] = [];
    const quizzes: QuizSet[] = [];
    for (const id of boardOrder) {
      const meta = boards[id];
      const data = boardData[id];
      if (!meta || meta.archived || !data) continue;
      const cards: Card[] = [];
      const questions: Question[] = [];
      for (const page of data.pages) {
        for (const o of page.objects) {
          if (o.kind === "flashcard")
            cards.push({ key: `${id}:${o.id}`, front: o.front, back: o.back });
          else if (o.kind === "quiz")
            questions.push({
              question: o.question,
              options: o.options,
              answerIndex: o.answerIndex,
            });
        }
      }
      if (cards.length) {
        decks.push({
          boardId: id,
          title: meta.title,
          cards,
          due: cards.filter((c) => isDue(progress[c.key])).length,
        });
      }
      if (questions.length) quizzes.push({ boardId: id, title: meta.title, questions });
    }
    return { decks, quizzes };
  }, [boards, boardOrder, boardData, progress]);

  const stats = useMemo(() => {
    const streak = computeStreak(activity);
    const dueTotal = decks.reduce((acc, d) => acc + d.due, 0);
    let reviewed = 0;
    let correct = 0;
    for (const p of Object.values(progress)) {
      reviewed += p.total;
      correct += p.correct;
    }
    const quizQ = attempts.reduce((a, x) => a + x.total, 0);
    const quizC = attempts.reduce((a, x) => a + x.correct, 0);
    const accuracy =
      reviewed + quizQ > 0 ? Math.round(((correct + quizC) / (reviewed + quizQ)) * 100) : null;
    return { streak, dueTotal, reviewed, accuracy };
  }, [decks, progress, attempts, activity]);

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="grid h-8 w-8 place-items-center rounded-md hover:bg-accent"
              title="Dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="flex items-center gap-2 font-semibold">
              <GraduationCap className="h-4 w-4 text-primary" /> Learning Hub
            </h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-10 px-4 py-8 sm:px-6">
        {/* Stats (PRD Doc 6 §3, §17) */}
        <section className="grid gap-3 sm:grid-cols-4">
          <StatCard
            icon={<Flame className="h-5 w-5 text-orange-500" />}
            value={`${stats.streak} day${stats.streak === 1 ? "" : "s"}`}
            label="Study streak"
          />
          <StatCard
            icon={<Layers className="h-5 w-5 text-primary" />}
            value={String(stats.dueTotal)}
            label="Cards due"
          />
          <StatCard
            icon={<RotateCcw className="h-5 w-5 text-sky-500" />}
            value={String(stats.reviewed)}
            label="Total reviews"
          />
          <StatCard
            icon={<BarChart3 className="h-5 w-5 text-emerald-500" />}
            value={stats.accuracy === null ? "—" : `${stats.accuracy}%`}
            label="Accuracy"
          />
        </section>

        {/* Revision forecast (PRD Doc 12) */}
        {forecast.some((n) => n > 0) && (
          <section>
            <SectionHeader title="Upcoming revision" icon={<CalendarClock className="h-4 w-4" />} />
            <div className="grid grid-cols-7 gap-2">
              {forecast.map((count, i) => {
                const d = new Date(Date.now() + i * 86_400_000);
                const label =
                  i === 0 ? "Today" : d.toLocaleDateString(undefined, { weekday: "short" });
                const max = Math.max(...forecast, 1);
                return (
                  <div
                    key={i}
                    className="flex flex-col items-center gap-1 rounded-xl border bg-card p-2"
                  >
                    <div className="flex h-16 w-full items-end justify-center">
                      <div
                        className={`w-5 rounded-t ${count > 0 ? "bg-primary" : "bg-muted"}`}
                        style={{ height: `${Math.max(6, (count / max) * 100)}%` }}
                      />
                    </div>
                    <div className="text-xs font-semibold tabular-nums">{count}</div>
                    <div className="text-[10px] text-muted-foreground">{label}</div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* AI study planner (PRD Doc 12 §13) */}
        <StudyPlanner />

        {/* Flashcard decks (PRD Doc 6 §4-§7) */}
        <section>
          <SectionHeader title="Flashcard decks" icon={<Layers className="h-4 w-4" />} />
          {decks.length === 0 ? (
            <EmptyState
              title="No flashcards yet"
              subtitle="Open a board and use AI Studio to generate flashcards — they'll appear here as study decks."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {decks.map((d) => (
                <div
                  key={d.boardId}
                  className="flex flex-col rounded-xl border bg-card p-4 shadow-sm transition hover:border-primary"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{d.title}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {d.cards.length} card{d.cards.length === 1 ? "" : "s"}
                      </div>
                    </div>
                    {d.due > 0 && (
                      <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                        {d.due} due
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" className="h-8 flex-1 text-xs" onClick={() => setStudying(d)}>
                      <Play className="h-3.5 w-3.5" /> Study
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      onClick={() =>
                        navigate({ to: "/board/$boardId", params: { boardId: d.boardId } })
                      }
                    >
                      Open board
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Quizzes (PRD Doc 6 §8-§9) */}
        <section>
          <SectionHeader title="Quizzes" icon={<ListChecks className="h-4 w-4" />} />
          {quizzes.length === 0 ? (
            <EmptyState
              title="No quizzes yet"
              subtitle="Generate quiz questions in AI Studio on any board, then take them here."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {quizzes.map((q) => (
                <div
                  key={q.boardId}
                  className="flex flex-col rounded-xl border bg-card p-4 shadow-sm transition hover:border-primary"
                >
                  <div className="truncate text-sm font-semibold">{q.title}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {q.questions.length} question{q.questions.length === 1 ? "" : "s"}
                  </div>
                  <Button size="sm" className="mt-3 h-8 text-xs" onClick={() => setQuizzing(q)}>
                    <Play className="h-3.5 w-3.5" /> Take quiz
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent quiz results */}
        {attempts.length > 0 && (
          <section className="pb-16">
            <SectionHeader title="Recent quiz results" icon={<BarChart3 className="h-4 w-4" />} />
            <div className="overflow-hidden rounded-xl border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2">Quiz</th>
                    <th className="px-4 py-2">Score</th>
                    <th className="px-4 py-2 text-right">When</th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.slice(0, 8).map((a) => (
                    <tr key={a.id} className="border-t">
                      <td className="px-4 py-2 font-medium">{a.boardTitle}</td>
                      <td className="px-4 py-2">
                        <span
                          className={
                            a.correct / a.total >= 0.7 ? "text-emerald-600" : "text-orange-600"
                          }
                        >
                          {a.correct}/{a.total} ({Math.round((a.correct / a.total) * 100)}%)
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right text-muted-foreground">
                        {new Date(a.at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>

      {studying && <StudySession deck={studying} onClose={() => setStudying(null)} />}
      {quizzing && <QuizRunner quiz={quizzing} onClose={() => setQuizzing(null)} />}
    </div>
  );
}

// ---------- AI study planner (PRD Doc 12 §13) ----------

function StudyPlanner() {
  const navigate = useNavigate();
  const createNote = useNotes((s) => s.createNote);
  const appendBlocks = useNotes((s) => s.appendBlocks);
  const renameNote = useNotes((s) => s.renameNote);

  const [goal, setGoal] = useState("");
  const [examDate, setExamDate] = useState("");
  const [hours, setHours] = useState("2");
  const [busy, setBusy] = useState(false);
  const [plan, setPlan] = useState<StudyPlan | null>(null);

  async function generate() {
    if (!goal.trim()) {
      toast.error("Describe what you're studying for");
      return;
    }
    setBusy(true);
    setPlan(null);
    try {
      const res = await generateStudyPlan({
        data: {
          goal: goal.trim(),
          examDate: examDate || undefined,
          hoursPerDay: Math.min(16, Math.max(0.5, Number(hours) || 2)),
        },
      });
      setPlan(res.plan);
    } catch (e) {
      console.error(e);
      toast.error("Couldn't generate a plan");
    } finally {
      setBusy(false);
    }
  }

  function saveAsNote() {
    if (!plan) return;
    const id = createNote({ type: "standard" });
    renameNote(id, plan.title);
    appendBlocks(id, [
      { type: "text", content: plan.overview },
      ...plan.days.flatMap((d) => [
        { type: "h2" as const, content: `${d.day} — ${d.focus}` },
        ...d.tasks.map((t) => ({ type: "checklist" as const, content: t })),
      ]),
      ...(plan.tips.length
        ? [
            { type: "h3" as const, content: "Tips" },
            ...plan.tips.map((t) => ({ type: "bullet" as const, content: t })),
          ]
        : []),
    ]);
    toast.success("Study plan saved as a note");
    navigate({ to: "/note/$noteId", params: { noteId: id } });
  }

  return (
    <section>
      <SectionHeader title="AI study planner" icon={<Sparkles className="h-4 w-4" />} />
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="grid gap-2 sm:grid-cols-[1fr_150px_110px_auto]">
          <Input
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="What are you studying for? e.g. Physics semester finals"
          />
          <Input
            type="date"
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
            title="Exam date (optional)"
          />
          <Input
            type="number"
            min={0.5}
            max={16}
            step={0.5}
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            title="Hours per day"
          />
          <Button onClick={generate} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Plan
          </Button>
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Goal, optional exam date, and hours per day — the AI builds a day-by-day schedule you can
          save as a checklist note.
        </p>

        {plan && (
          <div className="mt-4 rounded-lg border bg-background p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">{plan.title}</div>
                <p className="mt-0.5 text-xs text-muted-foreground">{plan.overview}</p>
              </div>
              <Button size="sm" className="h-8 shrink-0 text-xs" onClick={saveAsNote}>
                <NotebookPen className="h-3.5 w-3.5" /> Save as note
              </Button>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {plan.days.map((d, i) => (
                <div key={i} className="rounded-lg border p-2">
                  <div className="text-xs font-semibold">{d.day}</div>
                  <div className="text-xs text-primary">{d.focus}</div>
                  <ul className="mt-1 space-y-0.5">
                    {d.tasks.map((t, j) => (
                      <li key={j} className="text-[11px] text-muted-foreground">
                        · {t}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// ---------- Study session (spaced repetition, PRD Doc 6 §6-§7) ----------

const GRADES: { grade: ReviewGrade; label: string; className: string }[] = [
  { grade: "again", label: "Again", className: "bg-red-500/10 text-red-600 hover:bg-red-500/20" },
  {
    grade: "hard",
    label: "Hard",
    className: "bg-orange-500/10 text-orange-600 hover:bg-orange-500/20",
  },
  {
    grade: "good",
    label: "Good",
    className: "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20",
  },
  { grade: "easy", label: "Easy", className: "bg-sky-500/10 text-sky-600 hover:bg-sky-500/20" },
];

function StudySession({ deck, onClose }: { deck: Deck; onClose: () => void }) {
  const progress = useLearning((s) => s.progress);
  const reviewCard = useLearning((s) => s.reviewCard);

  const [queue] = useState<Card[]>(() => {
    const due = deck.cards.filter((c) => isDue(progress[c.key]));
    const pool = due.length ? due : [...deck.cards];
    return pool.sort(() => Math.random() - 0.5);
  });
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [graded, setGraded] = useState({ correct: 0, total: 0 });

  const card = queue[index];
  const done = index >= queue.length;

  function grade(g: ReviewGrade) {
    reviewCard(card.key, g);
    setGraded((s) => ({ correct: s.correct + (g === "again" ? 0 : 1), total: s.total + 1 }));
    setFlipped(false);
    setIndex((i) => i + 1);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4 py-4">
        <button
          onClick={onClose}
          className="grid h-8 w-8 place-items-center rounded-md hover:bg-accent"
          title="Exit"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{deck.title}</div>
          <Progress
            value={(Math.min(index, queue.length) / queue.length) * 100}
            className="mt-1 h-1.5"
          />
        </div>
        <div className="text-xs tabular-nums text-muted-foreground">
          {Math.min(index + 1, queue.length)}/{queue.length}
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center p-4">
        {done ? (
          <div className="text-center">
            <Sparkles className="mx-auto h-10 w-10 text-primary" />
            <h2 className="mt-3 text-xl font-bold">Session complete</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {graded.correct}/{graded.total} recalled ·{" "}
              {graded.total ? Math.round((graded.correct / graded.total) * 100) : 0}% accuracy
            </p>
            <Button className="mt-5" onClick={onClose}>
              Back to Learning Hub
            </Button>
          </div>
        ) : (
          <button
            onClick={() => setFlipped((f) => !f)}
            className="flex min-h-64 w-full max-w-xl flex-col items-center justify-center rounded-2xl border bg-card p-8 text-center shadow-lg transition hover:border-primary"
          >
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {flipped ? "Back — how well did you know it?" : "Front — tap to flip"}
            </div>
            <div className="mt-4 text-xl font-medium leading-relaxed">
              {flipped ? card.back : card.front}
            </div>
          </button>
        )}
      </div>

      {!done && (
        <div className="mx-auto w-full max-w-xl px-4 pb-8">
          {flipped ? (
            <div className="grid grid-cols-4 gap-2">
              {GRADES.map(({ grade: g, label, className }) => (
                <button
                  key={g}
                  onClick={() => grade(g)}
                  className={`rounded-xl px-3 py-3 text-sm font-semibold transition ${className}`}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : (
            <Button className="w-full" variant="outline" onClick={() => setFlipped(true)}>
              Show answer
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- Quiz runner (PRD Doc 6 §8) ----------

function QuizRunner({ quiz, onClose }: { quiz: QuizSet; onClose: () => void }) {
  const recordQuizAttempt = useLearning((s) => s.recordQuizAttempt);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [finished, setFinished] = useState(false);

  const q = quiz.questions[index];

  function pick(i: number) {
    if (picked !== null) return;
    setPicked(i);
    if (i === q.answerIndex) setCorrect((c) => c + 1);
  }

  function next() {
    if (index + 1 >= quiz.questions.length) {
      const finalCorrect = correct;
      recordQuizAttempt({
        boardId: quiz.boardId,
        boardTitle: quiz.title,
        total: quiz.questions.length,
        correct: finalCorrect,
      });
      setFinished(true);
    } else {
      setIndex((i) => i + 1);
      setPicked(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4 py-4">
        <button
          onClick={onClose}
          className="grid h-8 w-8 place-items-center rounded-md hover:bg-accent"
          title="Exit"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{quiz.title}</div>
          <Progress
            value={((finished ? quiz.questions.length : index) / quiz.questions.length) * 100}
            className="mt-1 h-1.5"
          />
        </div>
        <div className="text-xs tabular-nums text-muted-foreground">
          {Math.min(index + 1, quiz.questions.length)}/{quiz.questions.length}
        </div>
      </div>

      <div className="flex flex-1 items-start justify-center overflow-y-auto p-4">
        {finished ? (
          <div className="mt-16 text-center">
            <Sparkles className="mx-auto h-10 w-10 text-primary" />
            <h2 className="mt-3 text-xl font-bold">Quiz complete</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {correct}/{quiz.questions.length} correct ·{" "}
              {Math.round((correct / quiz.questions.length) * 100)}%
            </p>
            <Button className="mt-5" onClick={onClose}>
              Back to Learning Hub
            </Button>
          </div>
        ) : (
          <div className="w-full max-w-xl">
            <div className="rounded-2xl border bg-card p-6 shadow-lg">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Question {index + 1}
              </div>
              <div className="mt-2 text-lg font-medium leading-relaxed">{q.question}</div>
              <div className="mt-4 space-y-2">
                {q.options.map((opt, i) => {
                  const isAnswer = i === q.answerIndex;
                  const isPicked = picked === i;
                  const revealed = picked !== null;
                  return (
                    <button
                      key={i}
                      onClick={() => pick(i)}
                      disabled={revealed}
                      className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition ${
                        revealed && isAnswer
                          ? "border-emerald-500 bg-emerald-500/10"
                          : revealed && isPicked
                            ? "border-red-500 bg-red-500/10"
                            : "border-border hover:border-primary hover:bg-accent"
                      }`}
                    >
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold">
                        {revealed && isAnswer ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          String.fromCharCode(65 + i)
                        )}
                      </span>
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
            {picked !== null && (
              <Button className="mt-4 w-full" onClick={next}>
                {index + 1 >= quiz.questions.length ? "Finish" : "Next question"}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Shared UI ----------

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm">
      <span className="grid h-10 w-10 place-items-center rounded-lg bg-muted">{icon}</span>
      <div>
        <div className="text-lg font-bold tabular-nums">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

function SectionHeader({ title, icon }: { title: string; icon?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        {title}
      </h2>
    </div>
  );
}

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-10 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 max-w-md text-xs text-muted-foreground">{subtitle}</p>
    </div>
  );
}
