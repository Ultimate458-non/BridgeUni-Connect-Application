# BridgeUni

Free, CV-first career readiness for young job seekers in Mangaung (Bloemfontein), South Africa.
Built by **AccessX** for the **BizTech Nexus Hackathon 2026**.

Most entry-level CVs are rejected by applicant tracking systems (ATS) before a person reads them.
BridgeUni helps young people:

- **Build an ATS-friendly CV** — one column, standard headings, black and white; print or save as PDF.
- **Learn free and prove it** — links to free courses from trusted providers; finishing one adds the
  certificate and skills to the CV in one tap.
- **Explore campuses** — the Varsity Explorer shows UFS, CUT and Motheo TVET with tiered 360° tours
  (VR headset → 360° view → light flat panorama) and "day in the life" walkthroughs.
- **Keep their progress** — a free account (cell number or email) saves the CV and course progress,
  so they can log in on any phone and carry on.

## Run it locally

Requires **Node.js 22.13 or newer**.

```bash
npm install
npm run dev
```

Open http://localhost:5173. `npm run dev` starts both the website (Vite) and the API server (port 8787).
With no Turso variables set, the API stores data in a local SQLite file (`data/bridgeuni.db`) — nothing
extra to configure for local development.

## Production

```bash
npm run build
npm start
```

One Node server serves the site and the API on `PORT` (default 8787).

| Setting | Default | Notes |
| --- | --- | --- |
| `PORT` | `8787` | |
| `DATABASE_PATH` | `data/bridgeuni.db` | Local SQLite file, used when `TURSO_DATABASE_URL` isn't set. Must be on a persistent disk, or accounts are lost on restart. |
| `TURSO_DATABASE_URL` | — | A `libsql://...` URL from [turso.tech](https://turso.tech). Set this (with `TURSO_AUTH_TOKEN`) on any host without a persistent disk, e.g. Vercel. |
| `TURSO_AUTH_TOKEN` | — | Auth token for the Turso database above. |
| `NODE_ENV` | — | Optional. Login cookies are `Secure` automatically when served over HTTPS. Don't set it on Railway (it would skip build tools). |
| `SIGNUP_LIMIT_PER_HOUR` | `40` | Sign-ups per connection per hour (internet cafés share one connection). |

## Deploy on Vercel

The database must be Turso (Vercel's serverless functions have no persistent disk):

1. [turso.tech](https://turso.tech) → create a database → copy its `libsql://...` URL and create an auth token.
2. vercel.com → **Add New Project** → import this repo.
3. **Settings → Environment Variables** → add `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`.
4. Deploy. `vercel.json` builds the site and routes `/api/*` to `api/[[...route]].ts`, a serverless
   function wrapping the same Hono app (`server/app.ts`).

## Deploy on Railway

Railway gives the service its own disk, so plain SQLite works without Turso:

1. railway.com → **New Project** → **Deploy from GitHub repo** → pick this repo.
2. Right-click the service → **Attach volume**, mount path `/data`.
3. **Variables:** `DATABASE_PATH=/data/bridgeuni.db`.
4. **Settings → Networking → Generate Domain**.

`railway.json` sets the build, start command and health check (`/api/health`).

## How it's built

- **Frontend:** React 19, TypeScript, TanStack Router (file routes in `src/routes`), Tailwind CSS v4.
- **Backend:** Hono (`server/app.ts`), run either as a long-lived Node server (`server/index.ts`, for
  Railway/local) or as a Vercel serverless function (`api/[[...route]].ts`) — same app either way.
- **Database:** SQLite via `@libsql/client` — a local file in dev/Railway, or
  [Turso](https://turso.tech) (hosted, libSQL-compatible) when `TURSO_DATABASE_URL` is set, which is
  required on serverless hosts like Vercel.
- **Accounts:** scrypt-hashed passwords, httpOnly session cookies that renew while in use, rate-limited
  login, same-origin checks on every write.
- **Sync:** the phone keeps a working copy (fast, works offline) that uploads shortly after each change;
  version checks stop one device silently overwriting another.
- **Light on data:** the 360° viewer is ~4 KB of WebGL and only downloads when a tour is started.

## Project structure

```
src/            React frontend (routes, components, lib)
server/         Hono API + SQLite (app.ts has the routes, index.ts runs it as a Node server)
api/            Vercel serverless entry point ([[...route]].ts), reuses server/app.ts
scripts/        dev.mjs — runs the web and API dev servers together
public/         Static assets (brand, tours)
railway.json    Railway deploy config (build/start/health check)
vercel.json     Vercel build + SPA routing config
```

## Content notes

- Courses and resources are in `src/lib/courses.ts`. Please check each link is still free before a demo.
- Varsity Explorer facts come from each institution's own website (`src/lib/varsities.ts`).
  Tours show a clearly labelled **sample scene** until real 360° photos (with the institution's
  permission) are added to `public/tours/`.
- BridgeUni is not affiliated with UFS, CUT or Motheo TVET College.
