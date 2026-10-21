import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

const DB_PATH = resolve(process.env.DATABASE_PATH ?? "data/bridgeuni.db");
mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new DatabaseSync(DB_PATH);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id              TEXT PRIMARY KEY,
    identifier      TEXT NOT NULL UNIQUE,          -- normalised email or +27 phone
    identifier_kind TEXT NOT NULL CHECK (identifier_kind IN ('email', 'phone')),
    name            TEXT NOT NULL DEFAULT '',
    password_hash   TEXT NOT NULL,
    created_at      TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash  TEXT PRIMARY KEY,                   -- sha256 of the cookie token; the token itself is never stored
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TEXT NOT NULL,
    expires_at  TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);

  CREATE TABLE IF NOT EXISTS certificates (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course      TEXT NOT NULL,
    provider    TEXT NOT NULL,
    issued_on   TEXT NOT NULL DEFAULT '',
    reference   TEXT NOT NULL DEFAULT '',            -- certificate ID or link
    status      TEXT NOT NULL CHECK (status IN ('verified', 'pending')),
    file_name   TEXT,
    file_type   TEXT,
    file_data   BLOB,
    created_at  TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS certificates_user ON certificates(user_id);

  CREATE TABLE IF NOT EXISTS user_data (
    user_id     TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    cv          TEXT NOT NULL,                      -- JSON
    progress    TEXT NOT NULL,                      -- JSON
    updated_at  TEXT NOT NULL
  );
`);

export type UserRow = {
  id: string;
  identifier: string;
  identifier_kind: "email" | "phone";
  name: string;
  password_hash: string;
  created_at: string;
};

export type PublicUser = { id: string; identifier: string; kind: "email" | "phone"; name: string; createdAt: string };

export const toPublic = (u: UserRow): PublicUser => ({
  id: u.id,
  identifier: u.identifier,
  kind: u.identifier_kind,
  name: u.name,
  createdAt: u.created_at,
});
