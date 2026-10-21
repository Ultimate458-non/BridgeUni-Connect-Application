import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Clock, ExternalLink, Glasses, Image as ImageIcon, MapPin, MessageCircleQuestion, Orbit, Play } from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { FlatPano } from "../../components/pano/FlatPano";
import { detectTier, type Tier, type TierInfo } from "../../lib/pano/tier";
import { sampleScene } from "../../lib/pano/sample";
import { INSTITUTIONS, pathwayOf, type Institution, type Scene } from "../../lib/varsities";

// The WebGL viewer is only downloaded when someone starts a 360° tour.
const PanoViewer = lazy(() => import("../../components/pano/PanoViewer"));

const TITLE = "Varsity Explorer: campus tours for UFS, CUT and Motheo · BridgeUni";
const DESCRIPTION =
  "Explore Free State campuses in Mangaung before you apply: 360° tours that work on any phone, and what a day of study is really like at a university, university of technology or TVET college.";

type Search = { i?: Institution["id"] };

export const Route = createFileRoute("/_app/varsities")({
  validateSearch: (s: Record<string, unknown>): Search =>
    INSTITUTIONS.some((x) => x.id === s.i) ? { i: s.i as Institution["id"] } : {},
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
  component: VarsityExplorer,
});

function VarsityExplorer() {
  const { i = "ufs" } = Route.useSearch();
  const navigate = useNavigate({ from: "/varsities" });
  const inst = INSTITUTIONS.find((x) => x.id === i)!;
  const [tierInfo, setTierInfo] = useState<TierInfo | null>(null);

  useEffect(() => {
    void detectTier().then(setTierInfo);
  }, []);

  return (
    <>
      <section className="border-b border-border bg-primary-soft">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:py-12">
          <span className="tag bg-card">Free State · Mangaung</span>
          <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">Varsity Explorer</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Look around campuses before you apply, and see what a day of study is really like — no app to install.
            Tours adjust to your phone: VR headset, 360° view, or a light flat panorama.
          </p>

          <div role="tablist" aria-label="Choose an institution" className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
            {INSTITUTIONS.map((x) => {
              const active = x.id === inst.id;
              return (
                <button
                  key={x.id}
                  role="tab"
                  aria-selected={active}
                  aria-controls="explorer-panel"
                  onClick={() => void navigate({ search: { i: x.id }, replace: true, resetScroll: false })}
                  className={`min-h-11 rounded-xl border p-3 text-center transition sm:p-4 sm:text-left ${
                    active ? "border-primary bg-card shadow-lift ring-2 ring-primary/30" : "border-border bg-card/70 hover:border-primary/40 hover:bg-card"
                  }`}
                >
                  <span className={`block text-lg font-extrabold ${active ? "text-primary" : ""}`}>{x.short}</span>
                  <span className="hidden text-sm text-muted-foreground sm:block">{x.name}</span>
                  <span className="mt-1 block text-xs text-muted-foreground sm:mt-2 sm:inline-block sm:rounded-md sm:bg-muted sm:px-2 sm:py-0.5 sm:font-semibold sm:text-foreground">
                    {x.kind === "University of technology" ? <><span className="sm:hidden">Univ. of tech</span><span className="hidden sm:inline">{x.kind}</span></> : x.kind}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <div id="explorer-panel" role="tabpanel" className="mx-auto grid max-w-6xl gap-8 px-4 pb-16 pt-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-8">
          {/* key forces a fresh tour when switching institution */}
          {inst.liveTour ? (
            <LiveTour key={inst.id} inst={inst} tierInfo={tierInfo} />
          ) : (
            <Tour key={inst.id} inst={inst} tierInfo={tierInfo} />
          )}
          <DayInTheLife inst={inst} />
        </div>
        <InstitutionFacts inst={inst} />
      </div>
    </>
  );
}

/* ---------------- Tour (tiered) ---------------- */

function Tour({ inst, tierInfo }: { inst: Institution; tierInfo: TierInfo | null }) {
  const [scene, setScene] = useState<Scene>(inst.scenes[0]);
  const [mode, setMode] = useState<Tier | null>(null);
  const [started, setStarted] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  // Default to what the device can handle; the person can switch.
  const tier: Tier = mode ?? tierInfo?.tier ?? "flat";
  const isSample = !scene.src;

  const source360 = useMemo(() => (isSample ? sampleScene() : scene.src!), [isSample, scene.src]);
  const sourceFlat = useMemo(
    () => (isSample ? sampleScene().toDataURL("image/jpeg", 0.8) : scene.srcLight ?? scene.src!),
    [isSample, scene.src, scene.srcLight],
  );

  const onFail = useCallback((reason: string) => {
    setNote(reason);
    setMode("flat");
  }, []);

  const size = isSample ? "No download — drawn on your phone" : scene.srcLight && tier === "flat" ? "Light photo" : "Full 360° photo";

  return (
    <section aria-labelledby="tour-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="tour-heading" className="text-2xl font-extrabold">{inst.short} campus tour</h2>
          <p className="text-sm text-muted-foreground">{scene.title} · {size}</p>
        </div>
        <div role="group" aria-label="Tour view" className="flex rounded-lg border border-border bg-card p-1 text-sm font-bold">
          {([
            ["360", "360°", Orbit, tierInfo?.canWebGL !== false],
            ["flat", "Flat (lighter)", ImageIcon, true],
          ] as const).map(([t, label, Icon, ok]) =>
            ok ? (
              <button key={t} type="button" aria-pressed={tier === t || (t === "360" && tier === "xr")}
                onClick={() => { setMode(t === "360" && tierInfo?.canXR ? "xr" : t); setNote(null); }}
                className={`inline-flex min-h-10 items-center gap-1.5 rounded-md px-3 py-2 ${
                  tier === t || (t === "360" && tier === "xr") ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}>
                <Icon className="size-4" aria-hidden /> {label}
              </button>
            ) : null,
          )}
        </div>
      </div>

      {tierInfo && !mode && <p className="mt-2 text-sm text-muted-foreground">{tierInfo.reason}</p>}
      {note && <p role="status" className="mt-2 rounded-md bg-accent-soft px-3 py-2 text-sm">{note}</p>}

      <div className="mt-4">
        {!started ? (
          <div className="relative flex h-[42vh] max-h-[420px] min-h-[240px] flex-col items-center justify-center gap-4 overflow-hidden rounded-xl bg-primary-deep p-6 text-center text-primary-foreground">
            {tier === "xr" ? <Glasses className="size-10 text-accent" aria-hidden /> : <Orbit className="size-10 text-accent" aria-hidden />}
            <p className="max-w-sm text-sm opacity-90">
              {tier === "flat"
                ? "Light panorama — works on any phone."
                : tier === "xr"
                  ? "360° view, with a VR option for headsets."
                  : "Interactive 360° view. Drag or tilt your phone to look around."}
            </p>
            <button type="button" className="btn-solid border-accent bg-accent text-accent-foreground hover:border-accent hover:bg-accent-soft" onClick={() => setStarted(true)}>
              <Play className="size-4" aria-hidden /> Start the tour
            </button>
          </div>
        ) : tier === "flat" ? (
          <FlatPano src={sourceFlat} alt={`${inst.short}: ${scene.title}`} />
        ) : (
          <Suspense fallback={<div className="flex h-[60vh] max-h-[560px] min-h-[300px] items-center justify-center rounded-xl bg-primary-deep text-sm font-semibold text-primary-foreground">Loading 360° view…</div>}>
            <PanoViewer source={source360} title={`${inst.short}: ${scene.title}`} canXR={tier === "xr"} onFail={onFail} />
          </Suspense>
        )}
      </div>

      {inst.scenes.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {inst.scenes.map((s) => (
            <button key={s.id} type="button" onClick={() => setScene(s)} aria-pressed={s.id === scene.id}
              className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${s.id === scene.id ? "border-primary bg-primary-soft text-primary" : "border-border-strong"}`}>
              {s.title}
            </button>
          ))}
        </div>
      )}

      <p className={`mt-3 text-sm ${isSample ? "rounded-md border border-accent/40 bg-accent-soft px-3 py-2" : "text-muted-foreground"}`}>
        {isSample && <strong>Sample only. </strong>}
        {scene.caption}
        {isSample && inst.officialTour && (
          <> For the real campus, see the <a href={inst.officialTour.url} target="_blank" rel="noreferrer" className="link">{inst.officialTour.label}</a>.</>
        )}
      </p>
    </section>
  );
}

/* ---------------- Official live tour (e.g. UFS) ---------------- */

function LiveTour({ inst, tierInfo }: { inst: Institution; tierInfo: TierInfo | null }) {
  const live = inst.liveTour!;
  const [started, setStarted] = useState(false);
  const saveData = tierInfo?.tier === "flat";
  return (
    <section aria-labelledby="tour-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="tour-heading" className="text-2xl font-extrabold">{inst.short} campus tour</h2>
          <p className="text-sm text-muted-foreground">Live 360° · Official tour by {inst.name}</p>
        </div>
        <span className="tag bg-success-soft text-success">Real campus</span>
      </div>

      <div className="mt-4">
        {!started ? (
          <div className="relative flex h-[42vh] max-h-[420px] min-h-[260px] flex-col items-center justify-center gap-4 overflow-hidden rounded-xl bg-primary-deep p-6 text-center text-primary-foreground">
            <Orbit className="size-10 text-accent" aria-hidden />
            <p className="max-w-sm text-sm opacity-90">
              Fly over the real {inst.mangaungCampuses[0]} in 360°. Drag to look around and tap the pins to explore.
            </p>
            {saveData && (
              <p className="max-w-sm rounded-md bg-primary-foreground/10 px-3 py-2 text-xs">
                Heads up: this tour uses more data than the rest of BridgeUni. Best on Wi-Fi.
              </p>
            )}
            <button type="button" onClick={() => setStarted(true)}
              className="btn-solid border-accent bg-accent text-accent-foreground hover:border-accent hover:bg-accent-soft">
              <Play className="size-4" aria-hidden /> Start the live tour
            </button>
          </div>
        ) : (
          <iframe
            src={live.url}
            title={live.title}
            allow="fullscreen; gyroscope; accelerometer; xr-spatial-tracking"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="block h-[64vh] max-h-[600px] min-h-[320px] w-full rounded-xl border-0 bg-primary-deep"
          />
        )}
      </div>

      <p className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>{live.credit}.</span>
        <a href={live.url} target="_blank" rel="noreferrer" className="link inline-flex min-h-10 items-center gap-1">
          Open full screen <ExternalLink className="size-3.5" aria-hidden />
          <span className="sr-only">(opens ufs.ac.za in a new tab)</span>
        </a>
      </p>
    </section>
  );
}

/* ---------------- Day in the life ---------------- */

function DayInTheLife({ inst }: { inst: Institution }) {
  const p = pathwayOf(inst.pathway);
  return (
    <section aria-labelledby="day-heading" className="panel p-5 sm:p-6">
      <h2 id="day-heading" className="text-2xl font-extrabold">{p.title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {p.blurb} A typical day — every programme and year is different.
      </p>
      <ol className="mt-5 space-y-0">
        {p.day.map((s, idx) => (
          <li key={s.title} className="relative flex gap-4 pb-5 last:pb-0">
            {idx < p.day.length - 1 && <span aria-hidden className="absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-0.5 bg-border" />}
            <span className="relative flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
              <Clock className="size-4" aria-hidden />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{s.time}</p>
              <h3 className="font-extrabold">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-6 rounded-lg bg-surface p-4">
        <h3 className="flex items-center gap-2 font-extrabold">
          <MessageCircleQuestion className="size-5 text-primary" aria-hidden /> Ask {inst.short} before you apply
        </h3>
        <ul className="mt-2 space-y-1 text-sm">
          {p.ask.map((q) => <li key={q}>• {q}</li>)}
        </ul>
      </div>
    </section>
  );
}

/* ---------------- Facts + official links ---------------- */

function InstitutionFacts({ inst }: { inst: Institution }) {
  return (
    <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
      <div className="panel p-5">
        <h2 className="text-lg font-extrabold">{inst.name}</h2>
        <p className="text-sm text-muted-foreground">{inst.kind}</p>
        <h3 className="mt-4 text-sm font-bold">Campuses in Mangaung</h3>
        <ul className="mt-2 space-y-1.5">
          {inst.mangaungCampuses.map((c) => (
            <li key={c} className="flex items-center gap-2 text-sm"><MapPin className="size-4 text-primary" aria-hidden /> {c}</li>
          ))}
        </ul>
        <div className="mt-5 grid gap-2">
          {inst.officialTour && (
            <a href={inst.officialTour.url} target="_blank" rel="noreferrer" className="btn-solid">
              {inst.officialTour.label} <ExternalLink className="size-4" aria-hidden />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          )}
          <a href={inst.website} target="_blank" rel="noreferrer" className="btn-ghost">
            Official website <ExternalLink className="size-4" aria-hidden />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </div>
        {inst.officialTour && <p className="mt-2 text-xs text-muted-foreground">{inst.officialTour.note}</p>}
      </div>
      <p className="text-xs text-muted-foreground">
        Campus details come from each institution's own website. BridgeUni isn't part of {inst.short}; always check
        dates and requirements with them directly.
      </p>
    </aside>
  );
}
