import { Link } from "@tanstack/react-router";
import { ArrowRight, CircleCheck, Circle, ExternalLink, GraduationCap, Orbit } from "lucide-react";
import { useAuth } from "../lib/auth";
import { COURSES } from "../lib/courses";
import { cvChecklist, useCV } from "../lib/cv-store";
import { formatDay, useProgress } from "../lib/progress-store";
import { HomeSearch } from "./HomeSearch";
import { SectorIcon } from "./SectorIcon";
import { SyncBadge } from "./SyncBadge";

/**
 * Home page for a logged-in person: picks up exactly where they left off — how complete the CV
 * is and the next step, plus courses in progress with where they stopped.
 */
export function WelcomeBack() {
  const { user } = useAuth();
  const { cv, loaded } = useCV();
  const { progress } = useProgress();

  const steps = cvChecklist(cv);
  const done = steps.filter((s) => s.done).length;
  const percent = Math.round((done / steps.length) * 100);
  const next = steps.find((s) => !s.done);
  const inProgress = COURSES.filter((c) => progress[c.id]?.status === "in-progress").sort((a, b) =>
    progress[b.id].updatedAt.localeCompare(progress[a.id].updatedAt),
  );
  const finished = COURSES.filter((c) => progress[c.id]?.status === "finished").length;
  const first = user?.name.trim().split(" ")[0];

  return (
    <section className="bg-primary text-primary-foreground" aria-labelledby="welcome-heading">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 id="welcome-heading" className="text-3xl font-black sm:text-4xl">
              Welcome back{first ? `, ${first}` : ""}
            </h1>
            <p className="mt-1 opacity-90">Everything is saved in your account. Pick up where you left off.</p>
          </div>
          <SyncBadge className="rounded-full bg-card px-3 py-1 md:hidden" />
        </div>

        <HomeSearch className="mt-6" />

        <div className="mt-8 grid gap-5 lg:grid-cols-[1.1fr_1fr]">
          {/* CV progress */}
          <div className="rounded-xl bg-card p-5 text-card-foreground shadow-lift sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-extrabold">Your CV</h2>
              <span className="text-sm font-bold text-primary">{loaded ? `${percent}% complete` : "…"}</span>
            </div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="CV completeness">
              <div className="h-full rounded-full bg-success transition-[width]" style={{ width: `${percent}%` }} />
            </div>
            <ul className="mt-4 grid gap-1.5 text-sm sm:grid-cols-2">
              {steps.map((s) => (
                <li key={s.label} className={`flex items-center gap-2 ${s.done ? "text-muted-foreground" : ""}`}>
                  {s.done ? <CircleCheck className="size-4 shrink-0 text-success" aria-hidden /> : <Circle className="size-4 shrink-0 text-border-strong" aria-hidden />}
                  <span className={s.done ? "line-through decoration-1" : ""}>{s.label}</span>
                  <span className="sr-only">{s.done ? "(done)" : "(to do)"}</span>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link to="/cv" className="btn-solid">
                {done === 0 ? "Start my CV" : next ? "Continue my CV" : "Open my CV"} <ArrowRight className="size-4" aria-hidden />
              </Link>
              {next && <span className="text-sm text-muted-foreground">Next: {next.label.toLowerCase()}</span>}
            </div>
          </div>

          {/* Courses in progress */}
          <div className="rounded-xl bg-card p-5 text-card-foreground shadow-lift sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-extrabold">Your courses</h2>
              <span className="text-sm text-muted-foreground">
                {inProgress.length} in progress{finished ? ` · ${finished} finished` : ""}
              </span>
            </div>
            {inProgress.length === 0 ? (
              <div className="mt-4 rounded-lg bg-surface p-4 text-sm">
                <GraduationCap className="size-6 text-primary" aria-hidden />
                <p className="mt-2">
                  {finished ? "Nice work — no courses in progress right now." : "You haven't started a course yet."} A free
                  certificate makes your CV stronger.
                </p>
                <Link to="/courses" className="link mt-2 inline-block">Find a free course →</Link>
              </div>
            ) : (
              <ul className="mt-4 space-y-3">
                {inProgress.slice(0, 3).map((c) => {
                  const p = progress[c.id];
                  return (
                    <li key={c.id} className="flex items-start gap-3 rounded-lg border border-border p-3">
                      <SectorIcon sector={c.sector} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold leading-tight">{c.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.provider} · started {formatDay(p.startedAt)}
                        </p>
                        {p.note.trim() && <p className="mt-1 text-sm">Stopped at: <strong>{p.note.trim()}</strong></p>}
                      </div>
                      <a href={c.url} target="_blank" rel="noreferrer" className="btn-ghost min-h-10 shrink-0 px-3 py-1.5 text-sm">
                        Continue <ExternalLink className="size-3.5" aria-hidden />
                        <span className="sr-only">{c.name} on {c.provider} (opens in a new tab)</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="mt-2 flex flex-wrap gap-x-5 text-sm">
              <Link to="/courses" className="link inline-flex min-h-10 items-center">All my courses →</Link>
              <Link to="/varsities" className="link inline-flex min-h-10 items-center gap-1"><Orbit className="size-4" aria-hidden /> Campus tours</Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
