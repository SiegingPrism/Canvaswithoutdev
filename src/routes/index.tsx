import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { useWhiteboard } from "@/lib/whiteboard/store";
import { Button } from "@/components/ui/button";
import {
  Plus,
  FolderOpen,
  Sparkles,
  PenLine,
  ArrowRight,
  Clock,
  Star,
  Wand2,
  NotebookPen,
  GraduationCap,
  Menu,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Slate — Dashboard" },
      { name: "description", content: "Your smart whiteboards, templates, and AI history." },
    ],
  }),
  component: Dashboard,
});

function relTime(t: number) {
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function Dashboard() {
  const navigate = useNavigate();
  const { boards, boardOrder, recentAI, createBoard } = useWhiteboard();

  const sorted = useMemo(
    () =>
      boardOrder
        .map((id) => boards[id])
        .filter((b) => b && !b.archived)
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [boards, boardOrder],
  );
  const continueBoard = sorted[0];
  const recent = sorted.slice(0, 8);

  function openNew() {
    const id = createBoard();
    navigate({ to: "/board/$boardId", params: { boardId: id } });
  }

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <PenLine className="h-4 w-4" />
            </span>
            Slate
          </Link>
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-2">
            <Link
              to="/library"
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent"
            >
              <FolderOpen className="h-4 w-4" /> Library
            </Link>
            <Link
              to="/notes"
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent"
            >
              <NotebookPen className="h-4 w-4" /> Notes
            </Link>
            <Link
              to="/learn"
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent"
            >
              <GraduationCap className="h-4 w-4" /> Learn
            </Link>
            <Button size="sm" onClick={() => openNew()}>
              <Plus className="h-4 w-4" /> New board
            </Button>
          </nav>

          {/* Mobile/Tablet Navigation */}
          <div className="flex md:hidden items-center gap-2">
            <Button size="sm" onClick={() => openNew()} className="h-9 px-3">
              <Plus className="h-4 w-4" /> <span>New</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 p-1">
                <DropdownMenuItem asChild>
                  <Link to="/library" className="flex items-center gap-2 w-full">
                    <FolderOpen className="h-4 w-4" /> Library
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/notes" className="flex items-center gap-2 w-full">
                    <NotebookPen className="h-4 w-4" /> Notes
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/learn" className="flex items-center gap-2 w-full">
                    <GraduationCap className="h-4 w-4" /> Learn
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-10 px-4 py-8 sm:px-6">
        {/* Home / hero */}
        <section>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
          <p className="mt-1 text-muted-foreground">
            Pick up where you left off, or start something new.
          </p>
        </section>

        {/* Continue Working */}
        {continueBoard && (
          <section>
            <SectionHeader title="Continue working" icon={<Clock className="h-4 w-4" />} />
            <button
              onClick={() =>
                navigate({ to: "/board/$boardId", params: { boardId: continueBoard.id } })
              }
              className="group flex w-full items-center justify-between gap-4 rounded-2xl border bg-card p-5 text-left shadow-sm transition hover:border-primary hover:shadow-md"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">{continueBoard.title}</h3>
                  {continueBoard.favorite && (
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Last edited {relTime(continueBoard.updatedAt)}
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
            </button>
          </section>
        )}

        {/* Quick Actions */}
        <section>
          <SectionHeader title="Quick actions" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <QuickCard
              icon={<Plus className="h-5 w-5" />}
              title="Blank board"
              subtitle="Start with a clean canvas"
              onClick={() => openNew()}
            />
            <QuickCard
              icon={<FolderOpen className="h-5 w-5" />}
              title="Open library"
              subtitle="Browse, sort, and organize"
              onClick={() => navigate({ to: "/library" })}
            />
            <QuickCard
              icon={<Sparkles className="h-5 w-5" />}
              title="AI-assisted board"
              subtitle="Start blank and open the AI helper"
              onClick={() => openNew()}
            />
            <QuickCard
              icon={<NotebookPen className="h-5 w-5" />}
              title="New note"
              subtitle="Block-based notes with AI actions"
              onClick={() => navigate({ to: "/notes" })}
            />
            <QuickCard
              icon={<GraduationCap className="h-5 w-5" />}
              title="Learning Hub"
              subtitle="Study flashcards & take quizzes"
              onClick={() => navigate({ to: "/learn" })}
            />
          </div>
        </section>

        {/* Recent Boards */}
        <section>
          <SectionHeader
            title="Recent boards"
            action={
              <Link to="/library" className="text-sm text-primary hover:underline">
                View all
              </Link>
            }
          />
          {recent.length === 0 ? (
            <EmptyState
              title="No boards yet"
              subtitle="Create your first board to get started."
              action={
                <Button onClick={() => openNew()}>
                  <Plus className="h-4 w-4" /> New board
                </Button>
              }
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {recent.map((b) => (
                <button
                  key={b.id}
                  onClick={() => navigate({ to: "/board/$boardId", params: { boardId: b.id } })}
                  className="group flex aspect-[4/3] flex-col overflow-hidden rounded-xl border bg-card text-left shadow-sm transition hover:border-primary hover:shadow-md"
                >
                  <div className="relative flex-1 overflow-hidden bg-gradient-to-br from-muted/40 to-muted">
                    {b.thumbnail ? (
                      <img
                        src={b.thumbnail}
                        alt=""
                        className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-xs text-muted-foreground">
                        Empty board
                      </div>
                    )}
                  </div>
                  <div className="border-t p-2">
                    <div className="flex items-center gap-1.5 text-sm font-medium">
                      {b.favorite && (
                        <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                      )}
                      <span className="truncate">{b.title}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">{relTime(b.updatedAt)}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Recent AI Creations */}
        <section className="pb-16">
          <SectionHeader title="Recent AI creations" icon={<Wand2 className="h-4 w-4" />} />
          {recentAI.length === 0 ? (
            <EmptyState
              title="Nothing here yet"
              subtitle="Ask the AI assistant inside a board and your prompts will appear here."
            />
          ) : (
            <div className="space-y-2">
              {recentAI.slice(0, 6).map((r) => (
                <div key={r.id} className="rounded-xl border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{r.prompt}</div>
                      <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {r.response}
                      </div>
                    </div>
                    <div className="shrink-0 text-xs text-muted-foreground">
                      {relTime(r.createdAt)}
                    </div>
                  </div>
                  {r.boardId && boards[r.boardId] && (
                    <Link
                      to="/board/$boardId"
                      params={{ boardId: r.boardId }}
                      className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      Open {boards[r.boardId].title} <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function SectionHeader({
  title,
  icon,
  action,
}: {
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        {title}
      </h2>
      {action}
    </div>
  );
}

function QuickCard({
  icon,
  title,
  subtitle,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex items-start gap-3 rounded-xl border bg-card p-4 text-left transition hover:border-primary hover:shadow-sm"
    >
      <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </span>
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      </div>
    </button>
  );
}

function EmptyState({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-10 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
