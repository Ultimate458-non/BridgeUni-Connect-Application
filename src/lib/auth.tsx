import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api, ApiError, type User } from "./api";
import { summarize, type BackupSummary } from "./backup";
import { loadCV, normalizeCV, saveCV, STORAGE_KEY } from "./cv-store";
import { DATA_REPLACED, LOCAL_CHANGE, emit } from "./events";
import { loadProgress, normalizeProgress, PROGRESS_KEY, saveProgress } from "./progress-store";

/*
 * An account is required. The account on the server is the source of truth; this phone keeps a
 * working copy (fast, works offline) that is uploaded shortly after every change and wiped as soon
 * as the person logs out or their session ends.
 */

export type SyncState = "idle" | "saving" | "saved" | "offline";

type ServerData = { cv: unknown; progress: unknown; updatedAt: string };

export type Conflict = { device: BackupSummary; account: BackupSummary; accountUpdatedAt: string };

type AuthContextValue = {
  user: User | null;
  ready: boolean;
  sync: SyncState;
  conflict: Conflict | null;
  /** Why nobody is logged in: they logged out, or the session ended (expired / logged out elsewhere). */
  signedOut: "logout" | "expired" | null;
  /** When this phone's changes last reached the account (this session). */
  lastSavedAt: Date | null;
  /** A one-off message to show the person (e.g. restored edits). */
  notice: string | null;
  dismissNotice: () => void;
  signup: (input: { identifier: string; password: string; name: string }) => Promise<void>;
  login: (input: { identifier: string; password: string }) => Promise<void>;
  /** Returns false (and does nothing) if there are unsaved changes and `force` is not set. */
  logout: (opts?: { force?: boolean }) => Promise<boolean>;
  resolveConflict: (keep: "account" | "device") => Promise<void>;
  updateName: (name: string) => Promise<void>;
  changePassword: (current: string, next: string) => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/* ---------- Which account this phone's data belongs to, and whether it has unsent changes ---------- */

const SYNC_KEY = "bridgeuni-sync";
/** `base` is the account version (server updatedAt) this phone last saw. */
type SyncRecord = { userId: string; dirty: boolean; base: string | null };

function readSync(): SyncRecord | null {
  try {
    const r = JSON.parse(window.localStorage.getItem(SYNC_KEY) ?? "null");
    return r && typeof r.userId === "string"
      ? { userId: r.userId, dirty: !!r.dirty, base: typeof r.base === "string" ? r.base : null }
      : null;
  } catch {
    return null;
  }
}
function writeSync(r: SyncRecord | null) {
  try {
    if (r) window.localStorage.setItem(SYNC_KEY, JSON.stringify(r));
    else window.localStorage.removeItem(SYNC_KEY);
  } catch {
    /* ignore */
  }
}

const localData = () => ({ cv: loadCV(), progress: loadProgress() });
const sameData = (a: { cv: unknown; progress: unknown }, b: { cv: unknown; progress: unknown }) =>
  JSON.stringify(normalizeCV(a.cv)) === JSON.stringify(normalizeCV(b.cv)) &&
  JSON.stringify(normalizeProgress(a.progress)) === JSON.stringify(normalizeProgress(b.progress));

function applyToDevice(userId: string, data: ServerData) {
  saveCV(normalizeCV(data.cv), { silent: true });
  saveProgress(normalizeProgress(data.progress), { silent: true });
  writeSync({ userId, dirty: false, base: data.updatedAt });
  emit(DATA_REPLACED);
}

/** Marks this phone as having unsent changes, keeping the account version it is based on. */
const markDirty = (userId: string) => {
  const r = readSync();
  writeSync({ userId, dirty: true, base: r?.userId === userId ? r.base : null });
};

/*
 * Unsent edits survive a session ending: if the session expires before changes reach the account,
 * they are parked here (same device, for 24 hours, only for the same person) and put back when that
 * person logs in again. A deliberate logout discards them.
 */
const PENDING_KEY = "bridgeuni-pending";
const PENDING_MAX_AGE_MS = 24 * 60 * 60 * 1000;
type Pending = { userId: string; base: string | null; at: number; cv: unknown; progress: unknown };

function stashUnsent() {
  const r = readSync();
  if (!r?.dirty) return;
  try {
    const pending: Pending = { userId: r.userId, base: r.base, at: Date.now(), ...localData() };
    window.localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  } catch {
    /* ignore */
  }
}

/** Returns (and always removes) parked edits, if they belong to this person and are recent. */
function takePending(userId: string): Pending | null {
  try {
    const raw = window.localStorage.getItem(PENDING_KEY);
    window.localStorage.removeItem(PENDING_KEY);
    const p = raw ? (JSON.parse(raw) as Pending) : null;
    return p && p.userId === userId && Date.now() - p.at < PENDING_MAX_AGE_MS ? p : null;
  } catch {
    return null;
  }
}

function discardPending() {
  try {
    window.localStorage.removeItem(PENDING_KEY);
  } catch {
    /* ignore */
  }
}

function clearDevice() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(PROGRESS_KEY);
  } catch {
    /* ignore */
  }
  writeSync(null);
  emit(DATA_REPLACED);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [sync, setSync] = useState<SyncState>("idle");
  const [conflict, setConflict] = useState<(Conflict & { server: ServerData }) | null>(null);
  const [signedOut, setSignedOut] = useState<AuthContextValue["signedOut"]>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const userRef = useRef<User | null>(null);
  const conflictRef = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  conflictRef.current = !!conflict;
  // Login sets userRef early (before `user` state) while account data downloads; only follow
  // the state when it actually changes, so a re-render mid-download can't reset it.
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  /** Puts the account's data on this phone and remembers when it was saved. */
  const adopt = useCallback((userId: string, data: ServerData) => {
    applyToDevice(userId, data);
    setLastSavedAt(new Date(data.updatedAt));
  }, []);

  /** Session ended (expired, password changed elsewhere, account gone): protect the data on this phone. */
  const expire = useCallback(() => {
    stashUnsent();
    clearDevice();
    setConflict(null);
    setUser(null);
    setSync("idle");
    setSignedOut("expired");
  }, []);

  /** Uploads this phone's data to the account. */
  const push = useCallback(async (opts: { keepalive?: boolean; force?: boolean } = {}): Promise<boolean> => {
    const u = userRef.current;
    if (!u) return false;
    if (timer.current) clearTimeout(timer.current);
    setSync("saving");
    const body = { ...localData(), baseUpdatedAt: readSync()?.base ?? null, force: opts.force === true };
    try {
      if (opts.keepalive) {
        // Page is closing: fire and forget.
        void fetch("/api/data", {
          method: "PUT",
          keepalive: true,
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        return true;
      }
      const { updatedAt } = await api<{ updatedAt: string }>("/data", { method: "PUT", body });
      writeSync({ userId: u.id, dirty: false, base: updatedAt });
      setLastSavedAt(new Date(updatedAt));
      setSync("saved");
      return true;
    } catch (e) {
      if (e instanceof ApiError && e.status === 409 && e.code === "stale" && e.data) {
        // Another phone saved first. Same content? Just adopt it. Otherwise ask which to keep.
        const server = e.data as ServerData;
        const local = localData();
        if (sameData(local, server)) {
          adopt(u.id, server);
          setSync("saved");
        } else {
          setConflict({
            device: summarize(local),
            account: summarize({ cv: normalizeCV(server.cv), progress: normalizeProgress(server.progress) }),
            accountUpdatedAt: server.updatedAt,
            server,
          });
          setSync("idle");
        }
        return false;
      }
      if (e instanceof ApiError && e.status === 401) {
        expire();
        return false;
      }
      setSync("offline");
      return false;
    }
  }, [expire, adopt]);

  /** Picks up changes saved from another phone, if this one has nothing unsent. */
  const refresh = useCallback(async () => {
    const u = userRef.current;
    const record = readSync();
    if (!u || conflictRef.current || record?.dirty) return;
    try {
      const { data } = await api<{ data: ServerData | null }>("/data");
      if (data && data.updatedAt !== record?.base && !readSync()?.dirty) adopt(u.id, data);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) expire();
      /* otherwise offline — try again next time */
    }
  }, [expire, adopt]);

  /** After login: decide whether the account or this phone has the data to keep. */
  const reconcile = useCallback(
    async (u: User) => {
      let server: ServerData | null;
      try {
        server = (await api<{ data: ServerData | null }>("/data")).data;
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) expire();
        else setSync("offline");
        return;
      }
      // Put back edits that were still unsent when this person's last session ended.
      const pending = takePending(u.id);
      if (pending) {
        saveCV(normalizeCV(pending.cv), { silent: true });
        saveProgress(normalizeProgress(pending.progress), { silent: true });
        writeSync({ userId: u.id, dirty: true, base: pending.base });
        emit(DATA_REPLACED);
        setNotice("We kept the changes you made before you were logged out.");
      }

      const record = readSync();
      const local = localData();
      const localEmpty = summarize(local).isEmpty;

      if (!server) {
        // New account (or never saved): this phone's CV moves into the account.
        writeSync({ userId: u.id, dirty: !localEmpty, base: null });
        if (!localEmpty) await push();
        return;
      }
      if (record?.userId === u.id) {
        // This phone already belongs to this account.
        if (record.dirty) await push();
        else adopt(u.id, server);
        setSync("saved");
        return;
      }
      if (localEmpty || sameData(local, server)) {
        adopt(u.id, server);
        setSync("saved");
        return;
      }
      // Old data left on this phone (from before sign-up was required) AND different data in the account: ask.
      setConflict({
        device: summarize(local),
        account: summarize({ cv: normalizeCV(server.cv), progress: normalizeProgress(server.progress) }),
        accountUpdatedAt: server.updatedAt,
        server,
      });
    },
    [push, expire, adopt],
  );

  // Who is logged in?
  useEffect(() => {
    let cancelled = false;
    api<{ user: User | null }>("/auth/me")
      .then(async ({ user: u }) => {
        if (cancelled) return;
        if (!u && readSync()) {
          // Data from a session that has since ended (expired / logged out elsewhere): wipe it,
          // parking any unsent edits for when this person logs back in.
          stashUnsent();
          clearDevice();
          setSignedOut("expired");
        }
        // Bring the account data onto the phone BEFORE showing app pages, so a page never
        // renders (and saves) a stale or empty CV first.
        userRef.current = u;
        if (u) await reconcile(u);
        if (cancelled) return;
        setUser(u);
        setReady(true);
      })
      .catch(() => {
        // API unreachable: nobody can be confirmed as logged in, so protected pages send people to log in.
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [reconcile]);

  // Upload local edits shortly after they happen; retry when back online; flush on close.
  useEffect(() => {
    const onChange = () => {
      const u = userRef.current;
      if (!u || conflictRef.current) return;
      markDirty(u.id);
      setSync("saving");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void push(), 1200);
    };
    // Closing the tab with changes that never reached the account (e.g. offline): warn first.
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (userRef.current && readSync()?.dirty && !navigator.onLine) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    const onOnline = () => {
      if (userRef.current && readSync()?.dirty) void push();
    };
    const onVisibility = () => {
      if (!userRef.current) return;
      if (document.visibilityState === "hidden") {
        if (readSync()?.dirty) void push({ keepalive: true });
      } else void refresh();
    };
    window.addEventListener(LOCAL_CHANGE, onChange);
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener(LOCAL_CHANGE, onChange);
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [push, refresh]);

  const signup = useCallback<AuthContextValue["signup"]>(
    async (input) => {
      const { user: u } = await api<{ user: User }>("/auth/signup", { method: "POST", body: input });
      setSignedOut(null);
      userRef.current = u;
      await reconcile(u);
      setUser(u);
    },
    [reconcile],
  );

  const login = useCallback<AuthContextValue["login"]>(
    async (input) => {
      const { user: u } = await api<{ user: User }>("/auth/login", { method: "POST", body: input });
      setSignedOut(null);
      userRef.current = u;
      await reconcile(u);
      setUser(u);
    },
    [reconcile],
  );

  const logout = useCallback<AuthContextValue["logout"]>(
    async ({ force = false } = {}) => {
      if (readSync()?.dirty && !conflictRef.current) {
        const ok = await push();
        if (!ok && !force) return false;
      }
      await api("/auth/logout", { method: "POST", body: {} }).catch(() => {});
      // Shared phones and internet cafés: nothing personal stays behind.
      discardPending();
      clearDevice();
      setConflict(null);
      setSignedOut("logout");
      setUser(null);
      setSync("idle");
      return true;
    },
    [push],
  );

  const resolveConflict = useCallback<AuthContextValue["resolveConflict"]>(
    async (keep) => {
      const u = userRef.current;
      if (!u || !conflict) return;
      if (keep === "account") {
        adopt(u.id, conflict.server);
        setSync("saved");
      } else {
        setConflict(null);
        markDirty(u.id);
        await push({ force: true });
      }
      setConflict(null);
    },
    [conflict, push, adopt],
  );

  const updateName = useCallback(async (name: string) => {
    const { user: u } = await api<{ user: User }>("/account", { method: "PATCH", body: { name } });
    setUser(u);
  }, []);

  const changePassword = useCallback(async (current: string, next: string) => {
    await api("/account/password", { method: "POST", body: { current, next } });
  }, []);

  const deleteAccount = useCallback(async (password: string) => {
    await api("/account", { method: "DELETE", body: { password } });
    discardPending();
    clearDevice();
    setConflict(null);
    setSignedOut("logout");
    setUser(null);
    setSync("idle");
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      ready,
      sync,
      conflict: conflict && { device: conflict.device, account: conflict.account, accountUpdatedAt: conflict.accountUpdatedAt },
      signedOut,
      lastSavedAt,
      notice,
      dismissNotice: () => setNotice(null),
      signup,
      login,
      logout,
      resolveConflict,
      updateName,
      changePassword,
      deleteAccount,
    }),
    [user, ready, sync, conflict, signedOut, lastSavedAt, notice, signup, login, logout, resolveConflict, updateName, changePassword, deleteAccount],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
