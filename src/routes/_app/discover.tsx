import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ExternalLink } from "lucide-react";
import { useState } from "react";

const TITLE = "Discover free courses for the job you want · BridgeUni";
const DESCRIPTION = "Free online courses from HP LIFE, IBM SkillsBuild, Microsoft Learn, Google and HubSpot Academy — filtered by the job you want.";

export const Route = createFileRoute("/_app/discover")({
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
  component: DiscoverPage,
});

type Job = "Admin" | "Marketing" | "Tech";
const JOBS: Job[] = ["Admin", "Marketing", "Tech"];

const PROVIDERS: { name: string; focus: string; blurb: string; url: string; jobs: Job[] }[] = [
  { name: "HP LIFE", focus: "Business", blurb: "Short business courses: communication, finance, customer service.", url: "https://www.life-global.org/", jobs: ["Admin", "Marketing"] },
  { name: "IBM SkillsBuild", focus: "AI & data", blurb: "Beginner courses in AI, data and cybersecurity, with digital badges.", url: "https://skillsbuild.org/", jobs: ["Tech"] },
  { name: "Microsoft Learn", focus: "Tech", blurb: "Microsoft 365, Excel and cloud skills, step by step.", url: "https://learn.microsoft.com/training/", jobs: ["Tech", "Admin"] },
  { name: "Google", focus: "Digital marketing", blurb: "Grow with Google: digital marketing and online business skills.", url: "https://grow.google/", jobs: ["Marketing"] },
  { name: "HubSpot Academy", focus: "Marketing & sales", blurb: "Inbound marketing, social media and sales courses with certificates.", url: "https://academy.hubspot.com/", jobs: ["Marketing"] },
];

function DiscoverPage() {
  const [job, setJob] = useState<Job | "All">("All");
  const shown = job === "All" ? PROVIDERS : PROVIDERS.filter((p) => p.jobs.includes(job));

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:pt-10">
      <span className="tag">Step 1 · Discover</span>
      <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">Free courses for the job you want</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Pick a job, open a free course, and come back to add your certificate.
      </p>

      <div role="group" aria-label="Filter by the job you want" className="mt-6 flex flex-wrap gap-2">
        {(["All", ...JOBS] as const).map((j) => (
          <button key={j} type="button" aria-pressed={job === j} onClick={() => setJob(j)}
            className={`inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-bold ${
              job === j ? "border-primary bg-primary text-primary-foreground" : "border-border-strong bg-card hover:border-primary hover:text-primary"
            }`}>
            {j === "All" ? "All jobs" : j}
          </button>
        ))}
      </div>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((p) => (
          <li key={p.name} className="panel flex flex-col p-5">
            <span className="tag self-start">{p.focus}</span>
            <h2 className="mt-3 text-xl font-extrabold">{p.name}</h2>
            <p className="mt-1 flex-1 text-sm text-muted-foreground">{p.blurb}</p>
            <p className="mt-3 text-xs font-semibold text-muted-foreground">Good for: {p.jobs.join(", ")}</p>
            <a href={p.url} target="_blank" rel="noopener noreferrer" className="btn-solid mt-4">
              Open course <ExternalLink className="size-4" aria-hidden />
              <span className="sr-only">(opens {p.name} in a new tab)</span>
            </a>
          </li>
        ))}
      </ul>

      <div className="mt-10 flex flex-col items-start justify-between gap-4 rounded-xl bg-primary-deep p-6 text-primary-foreground sm:flex-row sm:items-center">
        <div>
          <p className="text-xl font-extrabold">Finished a course?</p>
          <p className="text-sm opacity-85">Add your certificate — verified ones go straight onto your CV.</p>
        </div>
        <Link to="/certify" className="btn-solid border-accent bg-accent text-accent-foreground hover:border-accent hover:bg-accent-soft">
          Add a certificate <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
