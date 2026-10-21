import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, Eye, ExternalLink, Lightbulb, Plus, Printer, ShieldCheck, Trash2 } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { SyncBadge } from "../../components/SyncBadge";
import { useAuth } from "../../lib/auth";
import { COURSES, LINKEDIN_GUIDE_URL } from "../../lib/courses";
import {
  emptyEntry,
  splitSkills,
  useCV,
  type CV,
  type Certificate,
  type Entry,
} from "../../lib/cv-store";
import { useProgress } from "../../lib/progress-store";
import { useCertificates } from "../../lib/certificates";

const TITLE = "Free ATS-friendly CV builder · BridgeUni";
const DESCRIPTION =
  "Build a one-column, black-and-white CV that applicant tracking systems can read. Free, saved safely to your account as you type. Print or save as PDF.";

export const Route = createFileRoute("/_app/cv")({
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
  component: CVPage,
});

type EntryKey = "experience" | "education";

function CVPage() {
  const { cv, update, loaded } = useCV();
  // Verified certificates added on the Certify page appear on the CV automatically.
  const { certificates: serverCerts } = useCertificates();
  const verified: Certificate[] = serverCerts
    .filter((c) => c.status === "verified")
    .map((c) => ({ name: c.course, provider: c.provider, year: c.issuedOn.slice(0, 4) }));
  const { progress } = useProgress();
  const { user } = useAuth();
  const coursesInProgress = COURSES.filter((c) => progress[c.id]?.status === "in-progress");

  const setEntry = (key: EntryKey, i: number, field: keyof Entry, value: string) =>
    update(key, cv[key].map((e, idx) => (idx === i ? { ...e, [field]: value } : e)));
  const addEntry = (key: EntryKey) => update(key, [...cv[key], emptyEntry()]);
  const removeEntry = (key: EntryKey, i: number) => update(key, cv[key].filter((_, idx) => idx !== i));

  return (
    <div className="bg-surface print:bg-transparent">
      <div className="print-shell mx-auto grid max-w-6xl gap-8 px-4 pb-32 pt-8 sm:pt-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-start lg:pb-16">
        {/* ---------- Form ---------- */}
        <section className="no-print min-w-0" aria-labelledby="cv-heading">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 id="cv-heading" className="scroll-mt-20 text-3xl font-extrabold sm:text-4xl">Build your CV</h1>
            <SyncBadge />
          </div>
          <p className="mt-1 text-muted-foreground">
            {user?.name ? `Hi ${user.name.split(" ")[0]} — changes` : "Changes"} save to your account as you type.{" "}
            <a href="#cv-preview" className="link inline-flex min-h-10 items-center gap-1 lg:hidden">
              See preview <ArrowDown className="size-3.5" aria-hidden />
            </a>
          </p>

          <Tips cv={cv} loaded={loaded} certCount={cv.certificates.length + verified.length} inProgress={coursesInProgress.map((c) => c.name)} />

          <div className="mt-6 space-y-5">
            <FormSection title="About you" step={1}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full name" className="sm:col-span-2">
                  {(id) => (
                    <input id={id} className="field" autoComplete="name" placeholder="e.g. Lerato Mokoena"
                      value={cv.name} onChange={(e) => update("name", e.target.value)} />
                  )}
                </Field>
                <Field label="Email">
                  {(id) => (
                    <input id={id} type="email" inputMode="email" className="field" autoComplete="email"
                      placeholder="name@gmail.com" value={cv.email} onChange={(e) => update("email", e.target.value)} />
                  )}
                </Field>
                <Field label="Phone">
                  {(id) => (
                    <input id={id} type="tel" inputMode="tel" className="field" autoComplete="tel"
                      placeholder="071 234 5678" value={cv.phone} onChange={(e) => update("phone", e.target.value)} />
                  )}
                </Field>
                <Field label="Town / city">
                  {(id) => (
                    <input id={id} className="field" autoComplete="address-level2"
                      value={cv.location} onChange={(e) => update("location", e.target.value)} />
                  )}
                </Field>
                <Field
                  label="LinkedIn"
                  hint="Optional"
                  footer={
                    <a href={LINKEDIN_GUIDE_URL} target="_blank" rel="noreferrer" className="link inline-flex min-h-10 items-center gap-1 text-xs">
                      No LinkedIn yet? Free step-by-step guide
                      <ExternalLink className="size-3" aria-hidden />
                      <span className="sr-only">(opens in a new tab)</span>
                    </a>
                  }
                >
                  {(id) => (
                    <input id={id} type="url" inputMode="url" className="field" autoComplete="url"
                      placeholder="linkedin.com/in/your-name" value={cv.linkedin}
                      onChange={(e) => update("linkedin", e.target.value)} />
                  )}
                </Field>
              </div>
            </FormSection>

            <FormSection title="Summary" step={2}>
              <Field label="2–3 sentences about you" hint={`${cv.summary.trim().length} characters`}>
                {(id) => (
                  <textarea id={id} rows={4} className="field"
                    placeholder="e.g. Reliable matric graduate from Mangaung with retail experience. Good with customers and cash handling. Looking for an entry-level role in sales or admin."
                    value={cv.summary} onChange={(e) => update("summary", e.target.value)} />
                )}
              </Field>
            </FormSection>

            <FormSection title="Skills" step={3}>
              <Field label="Skills, separated by commas" hint={`${splitSkills(cv.skills).length} added`}>
                {(id) => (
                  <input id={id} className="field" placeholder="e.g. Customer service, Excel, Cash handling"
                    value={cv.skills} onChange={(e) => update("skills", e.target.value)} />
                )}
              </Field>
              {splitSkills(cv.skills).length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2" aria-label="Your skills">
                  {splitSkills(cv.skills).map((s, i) => <li key={`${s}-${i}`} className="tag">{s}</li>)}
                </ul>
              )}
            </FormSection>

            <EntryList
              title="Experience"
              step={4}
              itemLabel="Job"
              entries={cv.experience}
              placeholders={{ title: "e.g. Cashier", org: "e.g. Shoprite, Bloemfontein", dates: "e.g. Jan 2024 – Now",
                details: "What you did, one per line. Volunteering and piece jobs count." }}
              onChange={(i, f, v) => setEntry("experience", i, f, v)}
              onAdd={() => addEntry("experience")}
              onRemove={(i) => removeEntry("experience", i)}
            />

            <EntryList
              title="Education"
              step={5}
              itemLabel="School or course"
              entries={cv.education}
              placeholders={{ title: "e.g. National Senior Certificate", org: "e.g. Grey College", dates: "e.g. 2023",
                details: "Subjects or results worth mentioning." }}
              onChange={(i, f, v) => setEntry("education", i, f, v)}
              onAdd={() => addEntry("education")}
              onRemove={(i) => removeEntry("education", i)}
            />

            <Certificates items={cv.certificates} onChange={(items) => update("certificates", items)} />

            <div className="panel p-5 sm:p-6">
              <button type="button" className="btn-solid w-full text-base" onClick={() => window.print()}>
                <Printer className="size-5" aria-hidden /> Download PDF / Print
              </button>
              <p className="mt-3 text-sm text-muted-foreground">
                In the print window, pick <strong className="text-foreground">“Save as PDF”</strong> to keep a file,
                or print it at any internet café. Only the CV sheet prints, in black and white.
              </p>
            </div>
          </div>
        </section>

        {/* ---------- Preview ---------- */}
        <section
          id="cv-preview"
          aria-label="CV preview"
          className="min-w-0 scroll-mt-20 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto lg:px-1 lg:pb-2"
        >
          <div className="no-print mb-3 flex items-center justify-between text-sm">
            <span className="flex items-center gap-3">
              <span className="font-bold">Live preview</span>
              <a href="#cv-heading" className="link inline-flex min-h-10 items-center gap-1 lg:hidden">
                <ArrowUp className="size-3.5" aria-hidden /> Edit
              </a>
            </span>
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <ShieldCheck className="size-4 text-success" aria-hidden /> ATS-friendly format
            </span>
          </div>
          <CVSheet cv={cv} verified={verified} />
        </section>
      </div>

      {/* Phones: the two main actions stay within thumb reach while filling in a long form. */}
      <div className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-lift backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-xl gap-3">
          <a href="#cv-preview" className="btn-ghost flex-1 whitespace-nowrap px-3">
            <Eye className="size-4" aria-hidden /> Preview
          </a>
          <button type="button" className="btn-solid flex-[1.4] whitespace-nowrap px-3" onClick={() => window.print()}>
            <Printer className="size-4" aria-hidden /> Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================= Tips ================= */

function Tips({ cv, loaded, certCount, inProgress }: { cv: CV; loaded: boolean; certCount: number; inProgress: string[] }) {
  if (!loaded) return null;
  const tips: ReactNode[] = [];
  if (!cv.email.trim() || !cv.phone.trim())
    tips.push("Add an email and a phone number so employers can reach you.");
  if (cv.summary.trim().length < 60)
    tips.push("Write a summary of at least 60 characters — 2 or 3 short sentences.");
  const skills = splitSkills(cv.skills).length;
  if (skills < 5) tips.push(`List at least 5 skills (you have ${skills}).`);
  if (certCount === 0)
    tips.push(
      inProgress.length > 0 ? (
        <>
          Finish <strong>{inProgress[0]}</strong>
          {inProgress.length > 1 && ` (or ${inProgress.length - 1} more)`} to add a certificate.{" "}
          <Link to="/courses" className="link">Continue →</Link>
        </>
      ) : (
        <>
          Add a certificate. <Link to="/courses" className="link">Find a free course →</Link>
        </>
      ),
    );

  const done = tips.length === 0;
  return (
    <div
      className={`mt-5 rounded-lg border p-4 ${done ? "border-success/30 bg-success-soft" : "border-accent/40 bg-accent-soft"}`}
      role="status"
    >
      <h2 className="flex items-center gap-2 text-base font-extrabold">
        <Lightbulb className={`size-5 ${done ? "text-success" : "text-accent-foreground"}`} aria-hidden />
        {done ? "Looking strong!" : "Make it stronger"}
      </h2>
      {done ? (
        <p className="mt-1 text-sm">Your CV has the basics covered. Print it or save it as a PDF.</p>
      ) : (
        <ul className="mt-2 space-y-1.5 text-sm">
          {tips.map((t, i) => (
            <li key={i} className="flex gap-2">
              <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-accent-foreground" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ================= Form building blocks ================= */

function FormSection({ title, step, children }: { title: string; step?: number; children: ReactNode }) {
  return (
    <fieldset className="panel min-w-0 p-5 sm:p-6">
      <legend className="sr-only">{title}</legend>
      <h2 aria-hidden className="mb-4 flex items-center gap-2.5 text-lg font-extrabold">
        {step && (
          <span className="flex size-7 items-center justify-center rounded-full bg-primary-soft text-sm font-black text-primary">
            {step}
          </span>
        )}
        {title}
      </h2>
      {children}
    </fieldset>
  );
}

function Field({
  label,
  hint,
  footer,
  className = "",
  children,
}: {
  label: string;
  hint?: string;
  footer?: ReactNode;
  className?: string;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="label">{label}</label>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children(id)}
      {footer && <div className="mt-1.5">{footer}</div>}
    </div>
  );
}

function EntryList({
  title,
  step,
  itemLabel,
  entries,
  placeholders,
  onChange,
  onAdd,
  onRemove,
}: {
  title: string;
  step: number;
  itemLabel: string;
  entries: Entry[];
  placeholders: Entry;
  onChange: (i: number, field: keyof Entry, value: string) => void;
  onAdd: () => void;
  onRemove: (i: number) => void;
}) {
  return (
    <FormSection title={title} step={step}>
      <div className="space-y-4">
        {entries.map((entry, i) => (
          <div key={i} className="rounded-lg border border-border bg-surface p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-muted-foreground">{itemLabel} {i + 1}</span>
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="inline-flex min-h-10 items-center gap-1 rounded-md px-2 text-sm font-semibold text-muted-foreground hover:bg-danger-soft hover:text-danger"
                aria-label={`Remove ${itemLabel.toLowerCase()} ${i + 1}`}
              >
                <Trash2 className="size-4" aria-hidden /> Remove
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={title === "Experience" ? "Job title" : "Qualification"}>
                {(id) => <input id={id} className="field" placeholder={placeholders.title}
                  value={entry.title} onChange={(e) => onChange(i, "title", e.target.value)} />}
              </Field>
              <Field label={title === "Experience" ? "Company / place" : "School / institution"}>
                {(id) => <input id={id} className="field" placeholder={placeholders.org}
                  value={entry.org} onChange={(e) => onChange(i, "org", e.target.value)} />}
              </Field>
              <Field label="Dates" className="sm:col-span-2">
                {(id) => <input id={id} className="field" placeholder={placeholders.dates}
                  value={entry.dates} onChange={(e) => onChange(i, "dates", e.target.value)} />}
              </Field>
              <Field label="Details" className="sm:col-span-2">
                {(id) => <textarea id={id} rows={3} className="field" placeholder={placeholders.details}
                  value={entry.details} onChange={(e) => onChange(i, "details", e.target.value)} />}
              </Field>
            </div>
          </div>
        ))}
        <button type="button" className="btn-ghost w-full sm:w-auto" onClick={onAdd}>
          <Plus className="size-4" aria-hidden /> Add {itemLabel.toLowerCase()}
        </button>
      </div>
    </FormSection>
  );
}

function Certificates({ items, onChange }: { items: Certificate[]; onChange: (items: Certificate[]) => void }) {
  const [draft, setDraft] = useState<Certificate>({ name: "", provider: "", year: "" });
  const [open, setOpen] = useState(false);

  const add = () => {
    if (!draft.name.trim()) return;
    onChange([...items, { name: draft.name.trim(), provider: draft.provider.trim(), year: draft.year.trim() }]);
    setDraft({ name: "", provider: "", year: "" });
    setOpen(false);
  };

  return (
    <FormSection title="Certificates" step={6}>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          None yet. Finish a <Link to="/courses" className="link">free course</Link> and tap “I finished this” —
          it lands here with its skills.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((c, i) => (
            <li key={`${c.name}-${i}`} className="flex items-start justify-between gap-3 rounded-lg border border-border bg-surface p-3">
              <div className="min-w-0">
                <p className="wrap-break-word font-bold">{c.name}</p>
                <p className="text-sm text-muted-foreground">{[c.provider, c.year].filter(Boolean).join(" · ")}</p>
              </div>
              <button
                type="button"
                onClick={() => onChange(items.filter((_, idx) => idx !== i))}
                className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-md px-2 text-sm font-semibold text-muted-foreground hover:bg-danger-soft hover:text-danger"
                aria-label={`Remove certificate ${c.name}`}
              >
                <Trash2 className="size-4" aria-hidden /> Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {open ? (
        <div className="mt-4 grid gap-3 rounded-lg border border-dashed border-border-strong p-4 sm:grid-cols-[1fr_1fr_6rem]">
          <Field label="Certificate">
            {(id) => <input id={id} className="field" value={draft.name} autoFocus
              onChange={(e) => setDraft({ ...draft, name: e.target.value })} />}
          </Field>
          <Field label="Provider">
            {(id) => <input id={id} className="field" value={draft.provider}
              onChange={(e) => setDraft({ ...draft, provider: e.target.value })} />}
          </Field>
          <Field label="Year">
            {(id) => <input id={id} className="field" inputMode="numeric" value={draft.year}
              onChange={(e) => setDraft({ ...draft, year: e.target.value })} />}
          </Field>
          <div className="flex gap-3 sm:col-span-3">
            <button type="button" className="btn-solid" onClick={add} disabled={!draft.name.trim()}>Save certificate</button>
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <button type="button" className="btn-ghost mt-4 w-full sm:w-auto" onClick={() => setOpen(true)}>
          <Plus className="size-4" aria-hidden /> Add a certificate you already have
        </button>
      )}
    </FormSection>
  );
}

/* ================= The CV sheet (ATS-safe, one column, black and white) ================= */

const isFilled = (e: Entry) => [e.title, e.org, e.dates, e.details].some((v) => v.trim());

function CVSheet({ cv, verified = [] }: { cv: CV; verified?: Certificate[] }) {
  const contact = [cv.location, cv.phone, cv.email, cv.linkedin].map((s) => s.trim()).filter(Boolean);
  const skills = splitSkills(cv.skills);
  const experience = cv.experience.filter(isFilled);
  const education = cv.education.filter(isFilled);
  // Verified (server) certificates first, then ones added on this page — no duplicates.
  const seen = new Set<string>();
  const certificates = [...verified, ...cv.certificates].filter((c) => {
    const key = c.name.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const isEmpty =
    !cv.name.trim() && !cv.summary.trim() && !skills.length && !experience.length && !education.length;

  return (
    <article
      className="print-area rounded-md border border-border bg-card p-6 text-[13px] leading-snug text-ink shadow-lift sm:p-10 sm:text-[14px]"
      style={{ fontFamily: "var(--font-cv)" }}
    >
      <h2 className="text-[26px] font-bold leading-tight sm:text-[30px]" style={{ fontFamily: "var(--font-cv)" }}>
        {cv.name.trim() || <span className="no-print text-placeholder">Your name</span>}
      </h2>
      {contact.length > 0 && <p className="mt-1 wrap-break-word">{contact.join(" | ")}</p>}

      {isEmpty && (
        <p className="no-print mt-6 rounded-md border border-dashed border-border-strong p-4 text-sm text-muted-foreground">
          Start typing on the left — your CV builds itself here.
        </p>
      )}

      {cv.summary.trim() && (
        <CVSection title="Summary">
          <p className="whitespace-pre-line">{cv.summary.trim()}</p>
        </CVSection>
      )}

      {skills.length > 0 && (
        <CVSection title="Skills">
          <p>{skills.join(", ")}</p>
        </CVSection>
      )}

      {experience.length > 0 && (
        <CVSection title="Experience">
          {experience.map((e, i) => <CVEntry key={i} entry={e} />)}
        </CVSection>
      )}

      {education.length > 0 && (
        <CVSection title="Education">
          {education.map((e, i) => <CVEntry key={i} entry={e} />)}
        </CVSection>
      )}

      {certificates.length > 0 && (
        <CVSection title="Certificates">
          <ul>
            {certificates.map((c, i) => {
              const meta = [c.provider, c.year].map((s) => s.trim()).filter(Boolean);
              return (
                <li key={i}>
                  <strong>{c.name.trim()}</strong>
                  {meta.length > 0 && ` — ${meta.join(", ")}`}
                </li>
              );
            })}
          </ul>
        </CVSection>
      )}
    </article>
  );
}

function CVSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-5 break-inside-avoid-page">
      <h3
        className="mb-2 border-b border-ink pb-0.5 text-[13px] font-bold uppercase tracking-wider sm:text-[14px]"
        style={{ fontFamily: "var(--font-cv)" }}
      >
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function CVEntry({ entry }: { entry: Entry }) {
  const sub = [entry.org, entry.dates].map((s) => s.trim()).filter(Boolean).join(" | ");
  return (
    <div className="break-inside-avoid">
      {entry.title.trim() && <p className="font-bold">{entry.title.trim()}</p>}
      {sub && <p>{sub}</p>}
      {entry.details.trim() && <p className="mt-1 whitespace-pre-line">{entry.details.trim()}</p>}
    </div>
  );
}
