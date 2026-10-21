import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from "node:crypto";
import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { db, rowToUser, type UserRow } from "./db.ts";

const scrypt = (password: string, salt: Buffer, keylen: number, opts: ScryptOptions) =>
  new Promise<Buffer>((res, rej) => scryptCb(password, salt, keylen, opts, (e, k) => (e ? rej(e) : res(k))));

/* ---------- Passwords (scrypt, built into Node — no native modules) ---------- */

const N = 16384, R = 8, P = 1, KEYLEN = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, KEYLEN, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, n, r, p, saltB64, keyB64] = stored.split("$");
  if (algo !== "scrypt") return false;
  const expected = Buffer.from(keyB64, "base64");
  const key = await scrypt(password, Buffer.from(saltB64, "base64"), expected.length, { N: +n, r: +r, p: +p });
  return timingSafeEqual(key, expected);
}

/** Used when the account doesn't exist, so a login takes the same time either way. */
let dummyHash: Promise<string> | null = null;
export const getDummyHash = () => (dummyHash ??= hashPassword(randomBytes(16).toString("hex")));

/* ---------- Sessions (random token in an httpOnly cookie, only its hash in the DB) ---------- */

export const COOKIE = "bu_session";
const SESSION_DAYS = 30;
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export async function createSession(c: Context, userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_DAYS * 86_400_000);
  await db.execute({
    sql: "INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
    args: [sha256(token), userId, now.toISOString(), expires.toISOString()],
  });
  setSessionCookie(c, token, expires);
}

function setSessionCookie(c: Context, token: string, expires: Date): void {
  setCookie(c, COOKIE, token, {
    httpOnly: true,
    sameSite: "Lax",
    // Secure whenever the site is served over HTTPS (hosts like Railway/Vercel terminate TLS at a proxy).
    secure: process.env.NODE_ENV === "production" || c.req.header("x-forwarded-proto") === "https",
    path: "/",
    expires,
  });
}

/** Sessions slide: using BridgeUni at least once a month keeps you logged in. Renewed at most daily. */
const RENEW_AFTER_MS = 86_400_000;

export async function currentUser(c: Context): Promise<UserRow | null> {
  const token = getCookie(c, COOKIE);
  if (!token) return null;
  const hash = sha256(token);
  const now = new Date();
  const result = await db.execute({
    sql: `SELECT u.*, s.expires_at AS session_expires FROM sessions s JOIN users u ON u.id = s.user_id
          WHERE s.token_hash = ? AND s.expires_at > ?`,
    args: [hash, now.toISOString()],
  });
  const row = result.rows[0];
  if (!row) return null;

  const sessionExpires = row.session_expires as string;
  const fullLength = SESSION_DAYS * 86_400_000;
  if (Date.parse(sessionExpires) - now.getTime() < fullLength - RENEW_AFTER_MS) {
    const expires = new Date(now.getTime() + fullLength);
    await db.execute({ sql: "UPDATE sessions SET expires_at = ? WHERE token_hash = ?", args: [expires.toISOString(), hash] });
    setSessionCookie(c, token, expires);
  }
  return rowToUser(row);
}

export async function endSession(c: Context): Promise<void> {
  const token = getCookie(c, COOKIE);
  if (token) await db.execute({ sql: "DELETE FROM sessions WHERE token_hash = ?", args: [sha256(token)] });
  deleteCookie(c, COOKIE, { path: "/" });
}

export async function purgeExpiredSessions(): Promise<void> {
  await db.execute({ sql: "DELETE FROM sessions WHERE expires_at <= ?", args: [new Date().toISOString()] });
}

/* ---------- Simple in-memory rate limit for login / sign-up ---------- */

const buckets = new Map<string, { count: number; resetAt: number }>();

/** Returns true if this key has gone over `limit` attempts in `windowMs`. */
export function tooMany(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  b.count++;
  return b.count > limit;
}

export function clearLimit(key: string): void {
  buckets.delete(key);
}

export function pruneLimits(): void {
  const now = Date.now();
  for (const [k, b] of buckets) if (b.resetAt < now) buckets.delete(k);
}
