import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Award,
  CircleCheck,
  FileText,
  GraduationCap,
  Orbit,
  ShieldCheck,
  Smartphone,
  Wallet,
  UserPlus,
  Wifi,
} from "lucide-react";
import { SectorIcon } from "../components/SectorIcon";
import { HomeSearch } from "../components/HomeSearch";
import { WelcomeBack } from "../components/WelcomeBack";
import { useAuth } from "../lib/auth";
import { COURSES, RESOURCES, SECTOR_INFO, SECTORS, type CourseSector } from "../lib/courses";

const TITLE = "BridgeUni · Free CV builder that gets past hiring filters";
const DESCRIPTION =
  "Most entry-level CVs are rejected by hiring software before a person reads them. BridgeUni builds a free, ATS-friendly CV on your phone in 10 minutes — plus free courses to make it stronger.";

export const Route = createFileRoute("/")({
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
  component: Landing,
});

const TOPICS = SECTORS.filter((s): s is CourseSector => s !== "All");

function Landing() {
  const { user } = useAuth();
  return (
    <>
      {user ? <WelcomeBack /> : <Hero signedIn={false} />}
      <Topics />
      <ExplorerPromo />
      <Stats />
      <HowItWorks signedIn={!!user} />
      <Benefits />
      <WhyFree signedIn={!!user} />
    </>
  );
}

/* ---------------- Hero ---------------- */

function Hero({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="relative overflow-hidden bg-primary text-primary-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 -top-40 size-[34rem] rounded-full bg-primary-foreground/5"
      />
      <div aria-hidden className="pointer-events-none absolute -bottom-52 -left-32 size-[28rem] rounded-full bg-primary-deep/30" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:py-16 lg:grid-cols-[1.15fr_1fr] lg:py-20">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-bold">
            <span className="size-2 rounded-full bg-accent" aria-hidden /> Free for youth in Mangaung
          </span>
          <h1 className="mt-5 text-4xl font-black leading-[1.08] sm:text-5xl lg:text-[3.5rem]">
            Build a CV that gets you <span className="text-accent">seen</span>.
          </h1>
          <p className="mt-5 max-w-xl text-lg opacity-90">
            Over 70% of young job seekers are filtered out by hiring software before a person reads their CV.
            BridgeUni builds one that gets through — <strong>free, in 10 minutes, on your phone</strong>.
          </p>

          <HomeSearch className="mt-7" />

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              to={signedIn ? "/cv" : "/signup"}
              className="btn-solid border-accent bg-accent text-accent-foreground hover:border-accent hover:bg-accent-soft"
            >
              {signedIn ? "Continue my CV" : "Sign up free — build my CV"} <ArrowRight className="size-4" aria-hidden />
            </Link>
            {!signedIn && (
              <Link to="/login" className="btn-ghost border-primary-foreground/40 bg-transparent text-primary-foreground hover:border-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
                I already have an account
              </Link>
            )}
          </div>
          <p className="mt-4 text-sm opacity-80">
            {signedIn ? "Your CV is saved safely in your account." : "Free forever. Sign up in a minute with your cell number or email."}
          </p>
        </div>

        <CVMock />
      </div>
    </section>
  );
}

/** Decorative preview of an ATS-friendly CV. */
function CVMock() {
  return (
    <div aria-hidden className="relative mx-auto hidden w-full max-w-sm sm:block">
      <div className="rotate-2 rounded-xl bg-card p-6 text-foreground shadow-lift">
        <div className="h-4 w-40 rounded bg-foreground/85" />
        <div className="mt-2 h-2 w-56 rounded bg-foreground/25" />
        {["Summary", "Skills", "Experience", "Certifications"].map((s, i) => (
          <div key={s} className="mt-5">
            <p className="border-b border-foreground/30 pb-1 text-[0.625rem] font-extrabold uppercase tracking-widest">{s}</p>
            <div className="mt-2 space-y-1.5">
              <div className="h-2 w-full rounded bg-foreground/15" />
              <div className={`h-2 rounded bg-foreground/15 ${i % 2 ? "w-2/3" : "w-5/6"}`} />
            </div>
          </div>
        ))}
      </div>
      <div className="absolute -left-6 bottom-10 flex items-center gap-2 rounded-full bg-card px-4 py-2 text-sm font-bold text-success shadow-lift">
        <CircleCheck className="size-5" /> Passes ATS checks
      </div>
      <div className="absolute -right-3 top-8 flex items-center gap-2 rounded-full bg-card px-3 py-1.5 text-xs font-bold text-primary shadow-lift">
        <Award className="size-4" /> +1 certificate
      </div>
    </div>
  );
}

/* ---------------- Topics ---------------- */

function Topics() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-14 sm:py-20" aria-labelledby="topics-heading">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h2 id="topics-heading" className="text-3xl font-extrabold sm:text-4xl">Learn something new — free</h2>
          <p className="mt-2 text-muted-foreground">Free courses and free videos from trusted providers. Pick a topic.</p>
        </div>
        <Link to="/courses" className="link inline-flex min-h-10 items-center gap-1 no-underline hover:underline">
          See all topics <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TOPICS.map((s) => {
          const courses = COURSES.filter((c) => c.sector === s).length;
          const resources = RESOURCES.filter((r) => r.sectors.includes(s)).length;
          return (
            <li key={s}>
              <Link
                to="/courses"
                search={{ sector: s }}
                className="group flex h-full items-start gap-4 rounded-xl border border-border bg-card p-5 shadow-card transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lift"
              >
                <SectorIcon sector={s} size="lg" />
                <span className="min-w-0">
                  <span className="block text-lg font-extrabold group-hover:text-primary">{s}</span>
                  <span className="block text-sm text-muted-foreground">{SECTOR_INFO[s].blurb}</span>
                  <span className="mt-2 block text-xs font-semibold text-muted-foreground">
                    {courses} course{courses === 1 ? "" : "s"} · {resources} free resource{resources === 1 ? "" : "s"}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ---------------- Varsity Explorer ---------------- */

function ExplorerPromo() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-14 sm:pb-20" aria-labelledby="explorer-heading">
      <div className="grid items-center gap-8 overflow-hidden rounded-2xl bg-primary-deep p-7 text-primary-foreground sm:p-10 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-bold">
            <Orbit className="size-4 text-accent" aria-hidden /> New · Varsity Explorer
          </span>
          <h2 id="explorer-heading" className="mt-4 text-3xl font-extrabold sm:text-4xl">See the campus before you apply</h2>
          <p className="mt-3 opacity-90">
            360° campus tours and “day in the life” walkthroughs for UFS, CUT and Motheo TVET in Mangaung. Works in a
            VR headset, on a normal phone, or as a light flat panorama on older phones — no app to install.
          </p>
          <Link to="/varsities" className="btn-solid mt-6 border-accent bg-accent text-accent-foreground hover:border-accent hover:bg-accent-soft">
            Explore campuses <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
        <ul className="grid gap-3 text-sm">
          {[
            ["UFS", "University of the Free State"],
            ["CUT", "Central University of Technology, Free State"],
            ["Motheo", "Motheo TVET College"],
          ].map(([short, name]) => (
            <li key={short} className="flex items-center gap-3 rounded-xl bg-primary-foreground/10 p-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary-foreground text-sm font-black text-primary">{short.slice(0, 3)}</span>
              <span><strong className="block">{short}</strong><span className="opacity-80">{name}</span></span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------------- Stats ---------------- */

function Stats() {
  const stats = [
    { value: "70%+", label: "of young job seekers' CVs are filtered out by software before a person reads them" },
    { value: "R0", label: "to build your CV, print it, or take the courses we point you to" },
    { value: "10 min", label: "from a blank page to a CV that hiring systems can read" },
  ];
  return (
    <section className="bg-surface" aria-label="Why it matters">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.value}>
            <p className="font-display text-4xl font-black text-primary sm:text-5xl">{s.value}</p>
            <p className="mt-2 text-sm text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- How it works ---------------- */

function HowItWorks({ signedIn }: { signedIn: boolean }) {
  const steps = [
    { Icon: UserPlus, title: "Sign up free", body: "Use your cell number or email and a password. Your CV and progress are protected in your account." },
    { Icon: FileText, title: "Build your CV", body: "Name, contact, skills, work and school. Helpful examples show you what to write." },
    { Icon: GraduationCap, title: "Learn free, print it", body: "Finish a free course, add its certificate in one tap, then print or save your CV as a PDF." },
  ];
  return (
    <section className="mx-auto max-w-6xl px-4 py-14 sm:py-20" aria-labelledby="how-heading">
      <h2 id="how-heading" className="text-center text-3xl font-extrabold sm:text-4xl">How it works</h2>
      <ol className="mt-10 grid gap-6 md:grid-cols-3">
        {steps.map(({ Icon, title, body }, i) => (
          <li key={title} className="panel relative p-6 pt-8">
            <span className="absolute -top-4 left-6 flex size-8 items-center justify-center rounded-full bg-primary text-sm font-black text-primary-foreground">
              {i + 1}
            </span>
            <Icon className="size-8 text-primary" aria-hidden />
            <h3 className="mt-4 text-lg font-extrabold">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{body}</p>
          </li>
        ))}
      </ol>
      <div className="mt-10 text-center">
        <Link to={signedIn ? "/cv" : "/signup"} className="btn-solid px-6">
          {signedIn ? "Open my CV" : "Sign up free"} <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </section>
  );
}

/* ---------------- Benefits ---------------- */

function Benefits() {
  const items = [
    { Icon: ShieldCheck, title: "Get seen, not auto-rejected", body: "One column, standard headings, no graphics — the format hiring software reads." },
    { Icon: Wallet, title: "R0 to use, R0 to print", body: "Black-and-white only, so it's cheap at any internet café. Or save it as a PDF." },
    { Icon: Wifi, title: "Light on data", body: "No videos, no app to install. Works on an entry-level Android on a slow connection." },
    { Icon: Award, title: "Learn free, prove it", body: "Finish a free course and its certificate and skills go straight onto your CV." },
  ];
  return (
    <section className="bg-surface" aria-labelledby="benefits-heading">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
        <h2 id="benefits-heading" className="text-3xl font-extrabold sm:text-4xl">Made for job seekers like you</h2>
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map(({ Icon, title, body }) => (
            <li key={title} className="panel p-5">
              <span className="flex size-11 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <Icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-4 font-extrabold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------------- Why free + account ---------------- */

function WhyFree({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-14 sm:py-20" aria-labelledby="free-heading">
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
        <div>
          <h2 id="free-heading" className="text-3xl font-extrabold sm:text-4xl">Why it's free for youth — forever</h2>
          <ul className="mt-6 space-y-4">
            {[
              ["We don't build courses.", "We connect you to trusted free ones, so there's nothing to sell you."],
              ["Employers pay, not you.", "Recruiters, SETAs and CSI sponsors pay to reach job-ready candidates — only those who choose to share their CV."],
              ["Youth never pay.", "Not to build, not to print, not to learn."],
            ].map(([title, body]) => (
              <li key={title} className="flex gap-3">
                <CircleCheck className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
                <p><strong>{title}</strong> <span className="text-muted-foreground">{body}</span></p>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl bg-primary-deep p-7 text-primary-foreground shadow-lift sm:p-9">
          <Smartphone className="size-9 text-accent" aria-hidden />
          <h3 className="mt-4 text-2xl font-extrabold">
            {signedIn ? "Your CV is saved to your account" : "Your free account protects your work"}
          </h3>
          <ul className="mt-4 space-y-2 text-sm opacity-90">
            <li>• Your CV and progress are locked behind your password</li>
            <li>• Log in on any phone or café computer and carry on — log out and nothing stays behind</li>
            <li>• Pick up your courses where you left off</li>
          </ul>
          <Link
            to={signedIn ? "/cv" : "/signup"}
            className="btn-solid mt-6 border-accent bg-accent text-accent-foreground hover:border-accent hover:bg-accent-soft"
          >
            {signedIn ? "Open my CV" : "Sign up free"} <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
