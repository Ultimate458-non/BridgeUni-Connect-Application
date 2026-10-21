import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, BookOpen, CircleCheck, ExternalLink, Orbit, PlayCircle, Search, X } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { SectorIcon } from "../../components/SectorIcon";
import {
  COURSES,
  RESOURCES,
  SECTOR_INFO,
  SECTORS,
  type Course,
  type CourseSector,
  type Resource,
  type Sector,
} from "../../lib/courses";
import { addCourseToCV, hasCertificate, loadCV } from "../../lib/cv-store";
import { rank, type Searchable } from "../../lib/search";
import { EXPLORER_KEYWORDS } from "../../lib/varsities";
import { formatDay, useProgress, type CourseProgress, type CourseStatus } from "../../lib/progress-store";

const TITLE = "Free courses with certificates for your CV · BridgeUni";
const DESCRIPTION =
  "Free online courses in tech, business, marketing, healthcare, agriculture and job skills — plus free videos and reading. Finish one and add it to your CV in one tap.";

type Search = { sector?: CourseSector; q?: string };

export const Route = createFileRoute("/_app/courses")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    sector: SECTORS.includes(s.sector as Sector) && s.sector !== "All" ? (s.sector as CourseSector) : undefined,
    q: typeof s.q === "string" && s.q.trim() ? s.q.slice(0, 80) : undefined,
  }),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CoursesPage,
});

// What search looks at, and how much each part counts (title > skills > topic > provider).
const courseSearch = (c: Course): Searchable => ({
  fields: [[c.name, 4], [c.skills.join(" "), 3], [`${c.sector} ${SECTOR_INFO[c.sector].blurb}`, 2], [c.provider, 2]],
  sectors: [c.sector],
});
const resourceSearch = (r: Resource): Searchable => ({
  fields: [[r.name, 4], [r.blurb, 2], [r.sectors.join(" "), 2]],
  sectors: r.sectors,
});

function CoursesPage() {
  const { sector, q = "" } = Route.useSearch();
  const navigate = useNavigate({ from: "/courses" });
  const [onCV, setOnCV] = useState<Set<string>>(new Set());
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  const { progress, start, finish: markFinished, setNote, reset } = useProgress();

  const setSearch = (next: Search) =>
    void navigate({ search: (prev) => ({ ...prev, ...next }), replace: true, resetScroll: false });

  // Which courses are already on the CV — read in an effect, never during render.
  useEffect(() => {
    const cv = loadCV();
    setOnCV(new Set(COURSES.filter((c) => hasCertificate(cv, c.name)).map((c) => c.id)));
  }, [progress]);

  // Courses added to the CV before progress tracking existed still count as finished.
  const statusOf = (id: string): CourseStatus | undefined =>
    progress[id]?.status ?? (onCV.has(id) ? "finished" : undefined);

  const inProgress = COURSES.filter((c) => statusOf(c.id) === "in-progress").sort((a, b) =>
    progress[b.id].updatedAt.localeCompare(progress[a.id].updatedAt),
  );
  const finishedCount = COURSES.filter((c) => statusOf(c.id) === "finished").length;
  const courses = rank(
    COURSES.filter((c) => statusOf(c.id) !== "in-progress" && (!sector || c.sector === sector)),
    q,
    courseSearch,
  );
  const resources = rank(
    RESOURCES.filter((r) => !sector || r.sectors.includes(sector)),
    q,
    resourceSearch,
  );

  // "ufs", "campus tour", "motheo"… also point to the Varsity Explorer.
  const needle = q.trim().toLowerCase();
  const showExplorer =
    needle.length >= 2 && EXPLORER_KEYWORDS.some((k) => needle.includes(k) || (needle.length >= 3 && k.includes(needle)));

  const finish = (course: Course) => {
    addCourseToCV(course);
    markFinished(course.id);
    setOnCV((prev) => new Set(prev).add(course.id));
    setLastAdded(course.name);
  };

  const cardProps = (c: Course) => ({
    course: c,
    status: statusOf(c.id),
    progress: progress[c.id],
    onCV: onCV.has(c.id),
    onStart: () => start(c.id),
    onFinish: () => finish(c),
    onNote: (note: string) => setNote(c.id, note),
    onReset: () => reset(c.id),
  });

  return (
    <>
      {/* Header + search */}
      <section className="border-b border-border bg-primary-soft">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:py-12">
          <h1 className="text-3xl font-extrabold sm:text-4xl">Free courses &amp; learning</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            We point you to free courses from trusted providers. Tap <strong className="text-foreground">Start</strong>{" "}
            and we'll remember where you are. When you finish, add it to your CV in one tap.
          </p>
          <SearchBox value={q} onChange={(v) => setSearch({ q: v || undefined })} />
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 pb-16 pt-8">
        {/* Confirmation after adding */}
        <div aria-live="polite">
          {lastAdded && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-success/30 bg-success-soft p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-success">
                <CircleCheck className="size-5" aria-hidden />
                <span><strong>{lastAdded}</strong> and its skills are now on your CV.</span>
              </p>
              <Link to="/cv" className="btn-solid min-h-10 py-2 text-sm">See my CV <ArrowRight className="size-4" aria-hidden /></Link>
            </div>
          )}
        </div>

        {showExplorer && (
          <Link to="/varsities" className="mb-8 flex items-center gap-4 rounded-xl border border-primary/30 bg-primary-soft p-5 transition hover:shadow-lift">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Orbit className="size-6" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-extrabold">Varsity Explorer — campus tours</span>
              <span className="block text-sm text-muted-foreground">360° tours and “day in the life” for UFS, CUT and Motheo TVET in Mangaung.</span>
            </span>
            <ArrowRight className="size-5 shrink-0 text-primary" aria-hidden />
          </Link>
        )}

        {/* Continue where you left off */}
        {inProgress.length > 0 && (
          <section className="mb-12" aria-labelledby="continue-heading">
            <SectionHeading id="continue-heading" title="Continue where you left off"
              meta={`${inProgress.length} in progress${finishedCount ? ` · ${finishedCount} finished` : ""}`} />
            <p className="mt-1 text-sm text-muted-foreground">Saved to your account — carry on from any phone.</p>
            <ul className="mt-5 grid gap-5 md:grid-cols-2">
              {inProgress.map((c) => <CourseCard key={c.id} {...cardProps(c)} />)}
            </ul>
          </section>
        )}

        {/* Sector filter */}
        <div role="group" aria-label="Filter by topic" className="-mx-4 overflow-x-auto px-4 pb-1">
          <div className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
            {SECTORS.map((s) => {
              const active = s === "All" ? !sector : s === sector;
              return (
                <button
                  key={s}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSearch({ sector: s === "All" ? undefined : s })}
                  className={`inline-flex min-h-10 items-center gap-2 whitespace-nowrap rounded-full border px-4 text-sm font-bold transition-colors ${
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border-strong bg-card text-foreground hover:border-primary hover:text-primary"
                  }`}
                >
                  {s !== "All" && (
                    <span aria-hidden className="size-2 rounded-full" style={{ background: active ? "currentColor" : SECTOR_INFO[s].color }} />
                  )}
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        {/* Courses */}
        <section className="mt-8" aria-labelledby="courses-heading">
          <SectionHeading
            id="courses-heading"
            title={inProgress.length ? "More courses with a free certificate" : "Courses with a free certificate"}
            meta={`${courses.length} shown`}
          />
          {courses.length === 0 ? (
            <EmptyState what="courses" q={q} sector={sector} onReset={() => setSearch({ sector: undefined, q: undefined })} onPick={(s) => setSearch({ sector: s, q: undefined })} />
          ) : (
            <ul className="mt-5 grid gap-5 md:grid-cols-2">
              {courses.map((c) => <CourseCard key={c.id} {...cardProps(c)} />)}
            </ul>
          )}
        </section>

        {/* Free videos and reading */}
        <section className="mt-14" aria-labelledby="resources-heading">
          <SectionHeading id="resources-heading" title="Free videos & reading" meta={`${resources.length} shown`} />
          <p className="mt-1 text-sm text-muted-foreground">Free to open right now — great for learning at your own pace.</p>
          {resources.length === 0 ? (
            <EmptyState what="resources" q={q} sector={sector} onReset={() => setSearch({ sector: undefined, q: undefined })} onPick={(s) => setSearch({ sector: s, q: undefined })} />
          ) : (
            <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {resources.map((r) => <ResourceCard key={r.id} r={r} />)}
            </ul>
          )}
        </section>

        <div className="mt-14 flex flex-col items-start justify-between gap-4 rounded-xl bg-primary-deep p-6 text-primary-foreground sm:flex-row sm:items-center sm:p-8">
          <div>
            <p className="text-xl font-extrabold">Finished a course?</p>
            <p className="text-sm opacity-85">Check your CV — the certificate and skills are already on it.</p>
          </div>
          <Link to="/cv" className="btn-solid w-full border-accent bg-accent text-accent-foreground hover:border-accent hover:bg-accent-soft sm:w-auto">
            Go to my CV <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </div>
    </>
  );
}

function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const id = useId();
  // Local state so typing stays smooth; the URL follows.
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <div role="search" className="relative mt-6 max-w-xl">
      <label htmlFor={id} className="sr-only">Search courses and resources</label>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <input
        id={id}
        type="search"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onChange(e.target.value);
        }}
        placeholder="Try: nursing, Excel, farming"
        className="field h-12 rounded-xl pl-11 pr-11 shadow-card"
      />
      {text && (
        <button type="button" onClick={() => { setText(""); onChange(""); }}
          className="absolute right-1 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
          aria-label="Clear search">
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}

function SectionHeading({ id, title, meta }: { id: string; title: string; meta: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 id={id} className="text-2xl font-extrabold">{title}</h2>
      <span className="shrink-0 text-sm text-muted-foreground">{meta}</span>
    </div>
  );
}

function CourseCard({
  course: c,
  status,
  progress,
  onCV,
  onStart,
  onFinish,
  onNote,
  onReset,
}: {
  course: Course;
  status: CourseStatus | undefined;
  progress: CourseProgress | undefined;
  onCV: boolean;
  onStart: () => void;
  onFinish: () => void;
  onNote: (note: string) => void;
  onReset: () => void;
}) {
  const noteId = useId();
  const external = (label: string, className: string, onClick?: () => void) => (
    <a href={c.url} target="_blank" rel="noreferrer" className={className} onClick={onClick}>
      {label} on {c.provider} <ExternalLink className="size-4 shrink-0" aria-hidden />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );

  return (
    <li className="panel relative flex flex-col overflow-hidden p-5">
      <span aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ background: SECTOR_INFO[c.sector].color }} />
      <div className="flex flex-wrap items-center gap-2">
        <SectorIcon sector={c.sector} size="sm" />
        <span className="text-sm font-bold text-muted-foreground">{c.sector}</span>
        {status === "in-progress" && <span className="tag ml-auto">In progress</span>}
        {status === "finished" && (
          <span className="tag ml-auto bg-success-soft text-success"><CircleCheck className="size-3.5" aria-hidden /> Finished</span>
        )}
      </div>
      <h3 className="mt-3 text-xl font-extrabold leading-tight">{c.name}</h3>
      <p className="text-sm text-muted-foreground">
        {c.provider} · <span className="font-semibold text-success">{c.note}</span>
      </p>
      <div className="mt-3">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Adds to your CV</p>
        <ul className="mt-1.5 flex flex-wrap gap-1.5">
          {c.skills.map((s) => <li key={s} className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold">{s}</li>)}
        </ul>
      </div>

      {status === "in-progress" && progress && (
        <div className="mt-4 rounded-lg bg-surface p-3">
          <p className="text-xs text-muted-foreground">Started {formatDay(progress.startedAt)}</p>
          <label htmlFor={noteId} className="label mt-2">Where did you stop?</label>
          <input id={noteId} className="field" placeholder="e.g. Module 3, lesson 2" value={progress.note}
            onChange={(e) => onNote(e.target.value)} />
        </div>
      )}
      {status === "finished" && progress?.finishedAt && (
        <p className="mt-4 text-xs text-muted-foreground">Finished {formatDay(progress.finishedAt)}</p>
      )}

      <div className="mt-auto grid gap-3 pt-5 sm:grid-cols-2">
        {status === "in-progress" ? (
          <>
            {external("Continue", "btn-solid", onStart)}
            <button type="button" className="btn-ghost" onClick={onFinish}>I finished this</button>
          </>
        ) : status === "finished" ? (
          <>
            {external("Open", "btn-ghost")}
            {onCV ? (
              <span className="btn-success"><CircleCheck className="size-4" aria-hidden /> Added to CV</span>
            ) : (
              <button type="button" className="btn-solid" onClick={onFinish}>Add to CV again</button>
            )}
          </>
        ) : (
          <>
            {external("Start", "btn-solid", onStart)}
            <button type="button" className="btn-ghost" onClick={onFinish}>I finished this</button>
          </>
        )}
      </div>

      {status === "in-progress" && (
        <button type="button" onClick={onReset}
          className="mt-2 inline-flex min-h-10 items-center self-start text-xs font-semibold text-muted-foreground underline underline-offset-2 hover:text-foreground">
          Not doing this one? Remove from my courses
        </button>
      )}
    </li>
  );
}

function ResourceCard({ r }: { r: Resource }) {
  const Icon = r.medium === "Reading" ? BookOpen : PlayCircle;
  return (
    <li>
      <a href={r.url} target="_blank" rel="noreferrer"
        className="group flex h-full gap-3 rounded-xl border border-border bg-card p-4 shadow-card transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lift">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
          <Icon className="size-5" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-1 font-extrabold group-hover:text-primary">
            {r.name} <ExternalLink className="size-3.5 shrink-0 opacity-60" aria-hidden />
            <span className="sr-only">(opens in a new tab)</span>
          </span>
          <span className="mt-0.5 block text-sm text-muted-foreground">{r.blurb}</span>
          <span className="mt-2 block text-xs font-semibold text-success">{r.medium} · Free</span>
        </span>
      </a>
    </li>
  );
}

function EmptyState({
  what,
  q,
  sector,
  onReset,
  onPick,
}: {
  what: string;
  q: string;
  sector?: string;
  onReset: () => void;
  onPick: (s: CourseSector) => void;
}) {
  const why = q ? `matching “${q}”${sector ? ` in ${sector}` : ""}` : `in ${sector}`;
  return (
    <div className="mt-5 rounded-xl border border-dashed border-border-strong p-6 text-center">
      <p className="font-semibold">No {what} {why} yet.</p>
      <p className="mt-1 text-sm text-muted-foreground">Try a topic instead:</p>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {SECTORS.filter((s): s is CourseSector => s !== "All").map((s) => (
          <button key={s} type="button" onClick={() => onPick(s)}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border-strong bg-card px-3 text-sm font-semibold hover:border-primary hover:text-primary">
            <span aria-hidden className="size-2 rounded-full" style={{ background: SECTOR_INFO[s].color }} /> {s}
          </button>
        ))}
      </div>
      <button type="button" onClick={onReset} className="link mt-2 min-h-10 text-sm">Show everything</button>
    </div>
  );
}
