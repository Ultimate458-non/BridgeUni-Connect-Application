<p align="center">
  <img src="public/brand/logo-full.png" alt="BridgeUni" width="320">
</p>

<p align="center">
  <b>Free, CV-first career readiness for young job seekers in Mangaung (Bloemfontein), South Africa.</b>
</p>

<p align="center">
  <a href="https://bridgeuni-connect-application.vercel.app"><img alt="Live Demo" src="https://img.shields.io/badge/demo-live-2ea44f?style=flat-square"></a>
  <img alt="React 19" src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white">
  <img alt="Vite" src="https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white">
  <img alt="Hono" src="https://img.shields.io/badge/Hono-API-E36002?style=flat-square">
  <img alt="Turso" src="https://img.shields.io/badge/Turso-libSQL-4FF8D2?style=flat-square">
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind-v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white">
</p>

<p align="center">
  <a href="https://bridgeuni-connect-application.vercel.app"><b>▶ Live demo</b></a>
</p>

---

Most entry-level CVs are rejected by applicant tracking systems (ATS) before a human ever reads them.
BridgeUni closes that gap for first-time job seekers with one free, phone-first tool:

- **📄 Build an ATS-friendly CV** — one column, standard headings, black and white; print or save as PDF.
- **🎓 Learn free and prove it** — links to free courses from trusted providers; finishing one adds the
  certificate and skills to the CV in one tap.
- **🏛️ Explore campuses** — the Varsity Explorer shows UFS, CUT and Motheo TVET with tiered 360° tours
  (VR headset → 360° view → light flat panorama) and "day in the life" walkthroughs.
- **☁️ Keep their progress** — a free account (cell number or email) saves the CV and course progress,
  so they can log in on any phone and carry on.

## Why it's worth a look

This isn't a hackathon toy — it's a production-shaped full-stack app:

- **Real auth, done properly** — scrypt-hashed passwords, httpOnly/Secure session cookies that renew
  on use, per-connection rate limiting, and a same-origin/CSRF check on every write.
- **Offline-first sync** — the phone keeps a working copy that uploads shortly after each change, with
  optimistic-concurrency version checks so two devices can never silently clobber each other's data.
- **One codebase, two hosting models** — the same Hono API (`server/app.ts`) runs either as a
  persistent Node server (Railway) or as a Vercel serverless function, backed by SQLite locally and
  [Turso](https://turso.tech) (hosted libSQL) in serverless production — no code fork required.
- **Light by design** — the 360° campus viewer is ~4 KB of hand-rolled WebGL that only loads when a
  tour actually starts.

## Tech stack

| Layer | Choice |
| --- | --- |
| Frontend | React 19 · TypeScript · TanStack Router (file-based routes) · Tailwind CSS v4 |
| Backend | [Hono](https://hono.dev) on Node, deployable as a long-lived server or a serverless function |
| Database | SQLite via `@libsql/client` — local file in dev, [Turso](https://turso.tech) in serverless production |
| Hosting | [Vercel](https://vercel.com) (serverless) or [Railway](https://railway.com) (persistent disk) |

## Getting started

Requires **Node.js 22.13 or newer**.

```bash
npm install
npm run dev
```

Open http://localhost:5173 — `npm run dev` starts both the website (Vite) and the API server (port
8787). With no Turso variables set, the API stores data in a local SQLite file (`data/bridgeuni.db`),
so there's nothing extra to configure for local development.

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
4. Deploy. `vercel.json` builds the site and rewrites `/api/*` to `api/index.ts`, a serverless
   function wrapping the same Hono app (`server/app.ts`).

## Deploy on Railway

Railway gives the service its own disk, so plain SQLite works without Turso:

1. railway.com → **New Project** → **Deploy from GitHub repo** → pick this repo.
2. Right-click the service → **Attach volume**, mount path `/data`.
3. **Variables:** `DATABASE_PATH=/data/bridgeuni.db`.
4. **Settings → Networking → Generate Domain**.

`railway.json` sets the build, start command and health check (`/api/health`).

## Project structure

```
src/            React frontend (routes, components, lib)
server/         Hono API + SQLite (app.ts has the routes, index.ts runs it as a Node server)
api/            Vercel serverless entry point (index.ts), reuses server/app.ts
scripts/        dev.mjs — runs the web and API dev servers together
public/         Static assets (brand, tours)
railway.json    Railway deploy config (build/start/health check)
vercel.json     Vercel build + SPA/API routing config
```

## Content notes

- Courses and resources are in `src/lib/courses.ts`. Please check each link is still free before a demo.
- Varsity Explorer facts come from each institution's own website (`src/lib/varsities.ts`).
  Tours show a clearly labelled **sample scene** until real 360° photos (with the institution's
  permission) are added to `public/tours/`.
- BridgeUni is not affiliated with UFS, CUT or Motheo TVET College.

---

<p align="center">
  Built by <b>Ultimate Ngobeni</b> for <b>AccessX</b> at the <b>BizTech Nexus Hackathon 2026</b>.
</p>
