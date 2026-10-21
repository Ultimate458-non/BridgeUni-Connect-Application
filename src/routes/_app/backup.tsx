import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  BackupError,
  canShareFile,
  createBackup,
  downloadBackup,
  parseBackup,
  restoreBackup,
  shareBackup,
  summarize,
  toCode,
  type Backup,
  type BackupSummary,
} from "../../lib/backup";
import { formatDay } from "../../lib/progress-store";

const TITLE = "Back up or move your CV to a new phone · BridgeUni";
const DESCRIPTION =
  "Save a backup of your BridgeUni CV and course progress, or move it to another phone. No account, nothing uploaded — just a file or a code you keep.";

export const Route = createFileRoute("/_app/backup")({
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
  component: BackupPage,
});

function BackupPage() {
  const [current, setCurrent] = useState<BackupSummary | null>(null);
  const [shareable, setShareable] = useState(false);

  // Browser-only reads happen in an effect, never during render.
  useEffect(() => {
    setCurrent(summarize(createBackup()));
    setShareable(canShareFile());
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
      <header className="max-w-3xl">
        <span className="tag">Extra copy for you to keep</span>
        <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">Backup &amp; move</h1>
        <p className="mt-2 text-muted-foreground">
          Your CV is saved to your account, so on a new phone you can just log in. A backup is an extra copy
          that <strong className="text-foreground">you</strong> keep — as a file or a code — in case you ever
          lose access.
        </p>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-2 lg:items-start">
        <SaveCard current={current} shareable={shareable} />
        <RestoreCard current={current} onRestored={(s) => setCurrent(s)} />
      </div>

      <p className="mt-10 max-w-3xl rounded-lg bg-muted p-4 text-sm">
        <strong>Keep your backup private.</strong> It has your phone number and email in it. Only send it to
        yourself.
      </p>
    </div>
  );
}

/* ================= Save ================= */

function SaveCard({ current, shareable }: { current: BackupSummary | null; shareable: boolean }) {
  const [status, setStatus] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const codeId = useId();
  const codeRef = useRef<HTMLTextAreaElement>(null);
  const empty = current?.isEmpty ?? true;

  const onShare = async () => {
    const ok = await shareBackup(createBackup());
    setStatus(ok ? "Sent ✓ Keep that message — it's your backup." : null);
  };
  const onDownload = () => {
    downloadBackup(createBackup());
    setStatus("Saved ✓ Look in your Downloads folder.");
  };
  const onCopy = async () => {
    const text = code ?? "";
    try {
      await navigator.clipboard.writeText(text);
      setStatus("Code copied ✓ Paste it into a WhatsApp chat with yourself.");
    } catch {
      codeRef.current?.select();
      setStatus("Press and hold the code, then choose Copy.");
    }
  };

  return (
    <section className="panel p-5 sm:p-6" aria-labelledby="save-heading">
      <StepLabel n={1}>On your old phone</StepLabel>
      <h2 id="save-heading" className="mt-2 text-2xl font-extrabold">Save a backup</h2>

      <div className="mt-4 rounded-lg bg-surface p-3 text-sm">
        <p className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">On this phone now</p>
        {current ? <SummaryLine s={current} /> : <p>Checking…</p>}
      </div>

      {empty && current ? (
        <p className="mt-4 text-sm">
          Nothing to back up yet.{" "}
          <Link to="/cv" className="link">Start your CV →</Link>
        </p>
      ) : (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {shareable && (
              <button type="button" className="btn-solid sm:col-span-2" onClick={onShare} disabled={!current}>
                Send to myself (WhatsApp, email…)
              </button>
            )}
            <button
              type="button"
              className={shareable ? "btn-ghost" : "btn-solid"}
              onClick={onDownload}
              disabled={!current}
            >
              Download backup file
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setCode(code ? null : toCode(createBackup()))}
              aria-expanded={!!code}
              aria-controls={codeId}
              disabled={!current}
            >
              {code ? "Hide code" : "Copy as a code"}
            </button>
          </div>

          {code && (
            <div className="mt-4">
              <label htmlFor={codeId} className="label">Your backup code</label>
              <textarea
                id={codeId}
                ref={codeRef}
                readOnly
                rows={4}
                value={code}
                onFocus={(e) => e.currentTarget.select()}
                className="field break-all font-mono text-base lg:text-xs"
              />
              <button type="button" className="btn-solid mt-3 w-full" onClick={onCopy}>Copy code</button>
              <p className="mt-2 text-xs text-muted-foreground">
                The code is long — that's normal. Copy all of it.
              </p>
            </div>
          )}

          <p aria-live="polite" className="mt-4 min-h-5 text-sm font-semibold">{status}</p>
        </>
      )}
    </section>
  );
}

/* ================= Restore ================= */

function RestoreCard({
  current,
  onRestored,
}: {
  current: BackupSummary | null;
  onRestored: (s: BackupSummary) => void;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Backup | null>(null);
  const [done, setDone] = useState(false);
  const fileId = useId();
  const pasteId = useId();

  const check = (input: string) => {
    setDone(false);
    try {
      setPending(parseBackup(input));
      setError(null);
    } catch (e) {
      setPending(null);
      setError(e instanceof BackupError ? e.message : "We couldn't read that backup.");
    }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 1_000_000) {
      setPending(null);
      setError("That file is too big to be a BridgeUni backup.");
      return;
    }
    check(await file.text());
  };

  const confirm = () => {
    if (!pending) return;
    restoreBackup(pending);
    onRestored(summarize(pending));
    setPending(null);
    setText("");
    setDone(true);
  };

  const replacing = current && !current.isEmpty;

  return (
    <section className="panel p-5 sm:p-6" aria-labelledby="restore-heading">
      <StepLabel n={2}>On your new phone</StepLabel>
      <h2 id="restore-heading" className="mt-2 text-2xl font-extrabold">Restore a backup</h2>

      {done ? (
        <div className="mt-4 rounded-lg border border-success/30 bg-success-soft p-4" role="status">
          <p className="font-extrabold text-success">Restored ✓</p>
          <p className="mt-1 text-sm">Your CV and course progress are back on this phone.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link to="/cv" className="btn-solid">Open my CV</Link>
            <Link to="/courses" className="btn-ghost">My courses</Link>
          </div>
        </div>
      ) : pending ? (
        <div className="mt-4">
          <div className="rounded-lg bg-surface p-3 text-sm">
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              This backup has{pending.exportedAt && ` · saved ${formatDay(pending.exportedAt)}`}
            </p>
            <SummaryLine s={summarize(pending)} />
          </div>
          {replacing && (
            <p className="mt-3 rounded-lg border border-accent/40 bg-accent-soft p-3 text-sm" role="alert">
              <strong>This replaces what's on this phone now</strong>
              {current.name && <> (the CV for {current.name})</>}. If you need that too, save a backup of it first.
            </p>
          )}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button type="button" className="btn-solid" onClick={confirm}>
              {replacing ? "Replace & restore" : "Restore now"}
            </button>
            <button type="button" className="btn-ghost" onClick={() => setPending(null)}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-5">
          <div>
            <p className="label">From a backup file</p>
            <input
              id={fileId}
              type="file"
              accept=".json,application/json,text/plain"
              className="peer sr-only"
              onChange={(e) => {
                void onFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <label
              htmlFor={fileId}
              className="btn-ghost w-full cursor-pointer peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring"
            >
              Choose backup file
            </label>
            <p className="mt-2 text-xs text-muted-foreground">
              Saved from WhatsApp or email? It's usually in your Downloads folder.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-muted-foreground" aria-hidden>
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>

          <div>
            <label htmlFor={pasteId} className="label">Paste a backup code</label>
            <textarea
              id={pasteId}
              rows={4}
              className="field font-mono text-base lg:text-xs"
              placeholder="BRIDGEUNI1.eyJhcHAiOi…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
            />
            <button type="button" className="btn-solid mt-3 w-full" onClick={() => check(text)} disabled={!text.trim()}>
              Check code
            </button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-md border border-danger/30 bg-danger-soft p-3 text-sm font-semibold text-danger">
          ✗ {error}
        </p>
      )}
    </section>
  );
}

/* ================= Bits ================= */

function StepLabel({ n, children }: { n: number; children: ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
      <span aria-hidden className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">{n}</span>
      {children}
    </p>
  );
}

function SummaryLine({ s }: { s: BackupSummary }) {
  if (s.isEmpty) return <p>Nothing saved yet.</p>;
  const parts = [
    s.name ? `CV for ${s.name}` : "CV (no name yet)",
    plural(s.certificates, "certificate"),
    s.inProgress > 0 && `${s.inProgress} course${s.inProgress === 1 ? "" : "s"} in progress`,
    s.finished > 0 && `${s.finished} finished`,
  ].filter(Boolean);
  return <p className="font-semibold">{parts.join(" · ")}</p>;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
