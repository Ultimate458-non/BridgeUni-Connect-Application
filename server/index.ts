import { randomUUID } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { getConnInfo } from "@hono/node-server/conninfo";
import { Hono, type Context } from "hono";
import { bodyLimit } from "hono/body-limit";
import { secureHeaders } from "hono/secure-headers";
import { identifierError, parseIdentifier, passwordError } from "../src/lib/identifier.ts";
import {
  clearLimit,
  createSession,
  currentUser,
  endSession,
  getDummyHash,
  hashPassword,
  pruneLimits,
  purgeExpiredSessions,
  tooMany,
  verifyPassword,
} from "./auth.ts";
import { db, toPublic, type UserRow } from "./db.ts";

const PORT = Number(process.env.PORT ?? 8787);
const MAX_DATA_BYTES = 256 * 1024; // a CV + progress is a few KB; this is generous
const SIGNUP_LIMIT_PER_HOUR = Number(process.env.SIGNUP_LIMIT_PER_HOUR ?? 40);
const app = new Hono();

app.use("*", secureHeaders({ crossOriginResourcePolicy: "same-origin" }));

/* ---------- CSRF guard for the API ----------
 * Session cookie is SameSite=Lax, every write must be JSON (a cross-site form can't send that
 * without a CORS preflight, which we never allow), and a present Origin must match our host. */
app.use("/api/*", async (c, next) => {
  if (c.req.method !== "GET" && c.req.method !== "HEAD") {
    if (!c.req.header("content-type")?.includes("application/json"))
      return c.json({ error: "Expected JSON." }, 415);
    const origin = c.req.header("origin");
    const host = c.req.header("x-forwarded-host") ?? c.req.header("host");
    if (origin && host && new URL(origin).host !== host) return c.json({ error: "Bad origin." }, 403);
  }
  c.header("Cache-Control", "no-store");
  await next();
});
// Certificate uploads (≤ 2 MB file, sent as base64 JSON) get a bigger body limit than everything else.
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const tooMuch = (c: Context) => c.json({ error: "That's too much data." }, 413);
const smallBody = bodyLimit({ maxSize: MAX_DATA_BYTES + 4096, onError: tooMuch });
const uploadBody = bodyLimit({ maxSize: Math.ceil(MAX_FILE_BYTES * 1.4) + 8192, onError: tooMuch });
app.use("/api/*", (c, next) => (c.req.path === "/api/certificates" && c.req.method === "POST" ? uploadBody : smallBody)(c, next));

const ip = (c: Context) => c.req.header("x-forwarded-for")?.split(",")[0].trim() ?? getConnInfo(c).remote.address ?? "?";

async function readJSON(c: Context): Promise<Record<string, unknown>> {
  try {
    const body = await c.req.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
const str = (v: unknown) => (typeof v === "string" ? v : "");

/* ---------- Auth ---------- */

app.post("/api/auth/signup", async (c) => {
  // Per connection, not per person: a whole internet café shares one IP, so keep this generous.
  if (tooMany(`signup:${ip(c)}`, SIGNUP_LIMIT_PER_HOUR, 60 * 60_000))
    return c.json({ error: "Too many sign-ups from this connection. Try again in an hour." }, 429);

  const body = await readJSON(c);
  const rawId = str(body.identifier);
  const password = str(body.password);
  const name = str(body.name).trim().slice(0, 100);

  const idErr = identifierError(rawId);
  if (idErr) return c.json({ error: idErr, field: "identifier" }, 400);
  const pwErr = passwordError(password, rawId);
  if (pwErr) return c.json({ error: pwErr, field: "password" }, 400);

  const id = parseIdentifier(rawId)!;
  const exists = db.prepare("SELECT 1 FROM users WHERE identifier = ?").get(id.value);
  if (exists) {
    const what = id.kind === "email" ? "email" : "phone number";
    return c.json({ error: `There's already an account with this ${what}. Log in instead.`, field: "identifier", code: "exists" }, 409);
  }

  const user: UserRow = {
    id: randomUUID(),
    identifier: id.value,
    identifier_kind: id.kind,
    name,
    password_hash: await hashPassword(password),
    created_at: new Date().toISOString(),
  };
  db.prepare(
    "INSERT INTO users (id, identifier, identifier_kind, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(user.id, user.identifier, user.identifier_kind, user.name, user.password_hash, user.created_at);
  createSession(c, user.id);
  return c.json({ user: toPublic(user) }, 201);
});

app.post("/api/auth/login", async (c) => {
  const body = await readJSON(c);
  const id = parseIdentifier(str(body.identifier));
  const password = str(body.password);
  const limitKey = `login:${ip(c)}:${id?.value ?? ""}`;
  if (tooMany(limitKey, 10, 15 * 60_000))
    return c.json({ error: "Too many tries. Wait 15 minutes and try again." }, 429);

  const user = id
    ? (db.prepare("SELECT * FROM users WHERE identifier = ?").get(id.value) as UserRow | undefined)
    : undefined;
  // Always run a hash so a wrong account and a wrong password take the same time.
  const ok = await verifyPassword(password, user?.password_hash ?? (await getDummyHash()));
  if (!user || !ok) return c.json({ error: "That email/phone number and password don't match." }, 401);

  clearLimit(limitKey);
  createSession(c, user.id);
  return c.json({ user: toPublic(user) });
});

app.post("/api/auth/logout", (c) => {
  endSession(c);
  return c.json({ ok: true });
});

app.get("/api/auth/me", (c) => {
  const user = currentUser(c);
  return c.json({ user: user ? toPublic(user) : null });
});

/* ---------- Account ---------- */

app.patch("/api/account", async (c) => {
  const user = currentUser(c);
  if (!user) return c.json({ error: "Please log in." }, 401);
  const body = await readJSON(c);
  const name = str(body.name).trim().slice(0, 100);
  db.prepare("UPDATE users SET name = ? WHERE id = ?").run(name, user.id);
  return c.json({ user: toPublic({ ...user, name }) });
});

app.post("/api/account/password", async (c) => {
  const user = currentUser(c);
  if (!user) return c.json({ error: "Please log in." }, 401);
  if (tooMany(`pw:${user.id}`, 10, 15 * 60_000)) return c.json({ error: "Too many tries. Wait 15 minutes." }, 429);
  const body = await readJSON(c);
  if (!(await verifyPassword(str(body.current), user.password_hash)))
    return c.json({ error: "Your current password is wrong.", field: "current" }, 400);
  const pwErr = passwordError(str(body.next), user.identifier);
  if (pwErr) return c.json({ error: pwErr, field: "next" }, 400);
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(await hashPassword(str(body.next)), user.id);
  // Log out every other device.
  db.prepare("DELETE FROM sessions WHERE user_id = ?").run(user.id);
  createSession(c, user.id);
  return c.json({ ok: true });
});

app.delete("/api/account", async (c) => {
  const user = currentUser(c);
  if (!user) return c.json({ error: "Please log in." }, 401);
  const body = await readJSON(c);
  if (!(await verifyPassword(str(body.password), user.password_hash)))
    return c.json({ error: "That password is wrong.", field: "password" }, 400);
  db.prepare("DELETE FROM users WHERE id = ?").run(user.id); // sessions + data cascade
  endSession(c);
  return c.json({ ok: true });
});

/* ---------- CV + course progress ---------- */

app.get("/api/data", (c) => {
  const user = currentUser(c);
  if (!user) return c.json({ error: "Please log in." }, 401);
  const row = db.prepare("SELECT cv, progress, updated_at FROM user_data WHERE user_id = ?").get(user.id) as
    | { cv: string; progress: string; updated_at: string }
    | undefined;
  if (!row) return c.json({ data: null });
  return c.json({ data: { cv: JSON.parse(row.cv), progress: JSON.parse(row.progress), updatedAt: row.updated_at } });
});

app.put("/api/data", async (c) => {
  const user = currentUser(c);
  if (!user) return c.json({ error: "Please log in." }, 401);
  const body = await readJSON(c);
  const isObj = (v: unknown) => !!v && typeof v === "object" && !Array.isArray(v);
  if (!isObj(body.cv) || !isObj(body.progress)) return c.json({ error: "Bad data." }, 400);
  const cv = JSON.stringify(body.cv);
  const progress = JSON.stringify(body.progress);
  if (cv.length + progress.length > MAX_DATA_BYTES) return c.json({ error: "That's too much data." }, 413);

  // Optimistic concurrency: a phone says which version it last saw. If another phone saved
  // since, refuse and hand back the newer version instead of silently overwriting it.
  const existing = db.prepare("SELECT cv, progress, updated_at FROM user_data WHERE user_id = ?").get(user.id) as
    | { cv: string; progress: string; updated_at: string }
    | undefined;
  const base = typeof body.baseUpdatedAt === "string" ? body.baseUpdatedAt : null;
  if (existing && body.force !== true && base !== existing.updated_at) {
    return c.json(
      {
        error: "Your account was updated on another device.",
        code: "stale",
        data: { cv: JSON.parse(existing.cv), progress: JSON.parse(existing.progress), updatedAt: existing.updated_at },
      },
      409,
    );
  }

  let updatedAt = new Date().toISOString();
  if (existing && updatedAt <= existing.updated_at) updatedAt = new Date(Date.parse(existing.updated_at) + 1).toISOString();
  db.prepare(
    `INSERT INTO user_data (user_id, cv, progress, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET cv = excluded.cv, progress = excluded.progress, updated_at = excluded.updated_at`,
  ).run(user.id, cv, progress, updatedAt);
  return c.json({ updatedAt });
});

/** For the host's health checks: is the server up and can it reach the database? */
app.get("/api/health", (c) => {
  db.prepare("SELECT 1").get();
  return c.json({ ok: true });
});

/* ---------- Certificates (saved against the logged-in user only) ---------- */

type CertRow = {
  id: string; course: string; provider: string; issued_on: string; reference: string;
  status: "verified" | "pending"; file_name: string | null; file_type: string | null; created_at: string;
};
const toCert = (r: CertRow) => ({
  id: r.id, course: r.course, provider: r.provider, issuedOn: r.issued_on, reference: r.reference,
  status: r.status, fileName: r.file_name, hasFile: !!r.file_name, createdAt: r.created_at,
});

/** Allowed uploads, checked by content ("magic bytes"), not just the name the browser sends. */
const FILE_TYPES: Record<string, (b: Buffer) => boolean> = {
  "application/pdf": (b) => b.subarray(0, 5).toString("latin1") === "%PDF-",
  "image/png": (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  "image/jpeg": (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
};

app.get("/api/certificates", (c) => {
  const user = currentUser(c);
  if (!user) return c.json({ error: "Please log in." }, 401);
  const rows = db
    .prepare("SELECT id, course, provider, issued_on, reference, status, file_name, file_type, created_at FROM certificates WHERE user_id = ? ORDER BY created_at DESC")
    .all(user.id) as CertRow[];
  return c.json({ certificates: rows.map(toCert) });
});

app.post("/api/certificates", async (c) => {
  const user = currentUser(c);
  if (!user) return c.json({ error: "Please log in." }, 401);
  const body = await readJSON(c);
  const course = str(body.course).trim().slice(0, 120);
  const provider = str(body.provider).trim().slice(0, 80);
  const issuedOn = str(body.issuedOn).trim();
  const reference = str(body.reference).trim().slice(0, 300);
  if (!course) return c.json({ error: "Enter the course name.", field: "course" }, 400);
  if (!provider) return c.json({ error: "Enter who gave the certificate.", field: "provider" }, 400);
  if (issuedOn && !/^\d{4}-\d{2}-\d{2}$/.test(issuedOn)) return c.json({ error: "Pick a valid date.", field: "issuedOn" }, 400);
  const count = (db.prepare("SELECT COUNT(*) AS n FROM certificates WHERE user_id = ?").get(user.id) as { n: number }).n;
  if (count >= 50) return c.json({ error: "You've reached the limit of 50 certificates." }, 400);

  let file: { name: string; type: string; data: Buffer } | null = null;
  const f = body.file as { name?: unknown; type?: unknown; data?: unknown } | undefined;
  if (f && typeof f === "object") {
    const type = str(f.type);
    const check = FILE_TYPES[type];
    if (!check) return c.json({ error: "Only PDF, PNG or JPG files are allowed.", field: "file" }, 400);
    const data = Buffer.from(str(f.data), "base64");
    if (data.length === 0) return c.json({ error: "That file is empty.", field: "file" }, 400);
    if (data.length > MAX_FILE_BYTES) return c.json({ error: "That file is bigger than 2 MB.", field: "file" }, 400);
    if (!check(data)) return c.json({ error: "That file isn't a real PDF, PNG or JPG.", field: "file" }, 400);
    const name = str(f.name).replace(/[^\w.\- ]+/g, "_").slice(0, 100) || "certificate";
    file = { name, type, data };
  }

  const row: CertRow = {
    id: randomUUID(), course, provider, issued_on: issuedOn, reference,
    status: reference ? "verified" : "pending",
    file_name: file?.name ?? null, file_type: file?.type ?? null, created_at: new Date().toISOString(),
  };
  db.prepare(
    "INSERT INTO certificates (id, user_id, course, provider, issued_on, reference, status, file_name, file_type, file_data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  ).run(row.id, user.id, row.course, row.provider, row.issued_on, row.reference, row.status, row.file_name, row.file_type, file?.data ?? null, row.created_at);
  return c.json({ certificate: toCert(row) }, 201);
});

app.get("/api/certificates/:id/file", (c) => {
  const user = currentUser(c);
  if (!user) return c.json({ error: "Please log in." }, 401);
  const row = db
    .prepare("SELECT file_name, file_type, file_data FROM certificates WHERE id = ? AND user_id = ?")
    .get(c.req.param("id"), user.id) as { file_name: string | null; file_type: string | null; file_data: Uint8Array | null } | undefined;
  if (!row?.file_data || !row.file_type) return c.json({ error: "Not found." }, 404);
  c.header("Content-Type", row.file_type);
  c.header("Content-Disposition", `inline; filename="${row.file_name ?? "certificate"}"`);
  c.header("Cache-Control", "private, no-store");
  return c.body(Buffer.from(row.file_data));
});

app.delete("/api/certificates/:id", (c) => {
  const user = currentUser(c);
  if (!user) return c.json({ error: "Please log in." }, 401);
  const r = db.prepare("DELETE FROM certificates WHERE id = ? AND user_id = ?").run(c.req.param("id"), user.id);
  return r.changes ? c.json({ ok: true }) : c.json({ error: "Not found." }, 404);
});

app.all("/api/*", (c) => c.json({ error: "Not found." }, 404));

/* ---------- Production: serve the built site ---------- */

const DIST = resolve("dist");
if (existsSync(DIST)) {
  app.use("/assets/*", serveStatic({ root: "./dist", onFound: (_p, c) => c.header("Cache-Control", "public, max-age=31536000, immutable") }));
  app.use("*", serveStatic({ root: "./dist" }));
  const indexHtml = readFileSync(resolve(DIST, "index.html"), "utf8");
  app.get("*", (c) => c.html(indexHtml)); // SPA fallback
}

setInterval(() => {
  purgeExpiredSessions();
  pruneLimits();
}, 60 * 60_000).unref();
purgeExpiredSessions();

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`BridgeUni API listening on http://localhost:${info.port}`);
});
