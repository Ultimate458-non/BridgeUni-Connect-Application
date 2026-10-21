import { useCallback, useEffect, useRef, useState } from "react";
import { DATA_REPLACED, LOCAL_CHANGE, emit } from "./events";

// Course progress, stored only on this device (like the CV). Courses run on the
// provider's site, so this tracks what the user tells us: started, where they stopped, finished.

export type CourseStatus = "in-progress" | "finished";

export type CourseProgress = {
  status: CourseStatus;
  /** ISO date strings */
  startedAt: string;
  updatedAt: string;
  finishedAt?: string;
  /** User's own reminder, e.g. "Stopped at module 3" */
  note: string;
};

/** Keyed by course id. A course with no entry has not been started. */
export type Progress = Record<string, CourseProgress>;

export const PROGRESS_KEY = "bridgeuni-progress";

const now = () => new Date().toISOString();

/** Turns untrusted data (localStorage, a backup file) into valid progress, dropping bad entries. */
export function normalizeProgress(data: unknown): Progress {
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};
  const out: Progress = {};
  for (const [id, p] of Object.entries(data as Record<string, Partial<CourseProgress>>)) {
    if (p?.status !== "in-progress" && p?.status !== "finished") continue;
    out[id] = {
      status: p.status,
      startedAt: typeof p.startedAt === "string" ? p.startedAt : now(),
      updatedAt: typeof p.updatedAt === "string" ? p.updatedAt : now(),
      finishedAt: typeof p.finishedAt === "string" ? p.finishedAt : undefined,
      note: typeof p.note === "string" ? p.note : "",
    };
  }
  return out;
}

export function loadProgress(): Progress {
  try {
    const raw = window.localStorage.getItem(PROGRESS_KEY);
    return raw ? normalizeProgress(JSON.parse(raw)) : {};
  } catch {
    return {};
  }
}

/** Same rules as saveCV: skips identical writes, announces user changes unless `silent`. */
export function saveProgress(progress: Progress, { silent = false } = {}): void {
  try {
    const json = JSON.stringify(progress);
    if ((window.localStorage.getItem(PROGRESS_KEY) ?? "{}") === json) return;
    window.localStorage.setItem(PROGRESS_KEY, json);
  } catch {
    // Storage full or blocked — progress still works for this session.
    return;
  }
  if (!silent) emit(LOCAL_CHANGE);
}

export function formatDay(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Progress state backed by localStorage. Same rule as useCV: read in an effect,
 * and only save after that first read so defaults never overwrite stored data.
 */
export function useProgress() {
  const [progress, setProgress] = useState<Progress>({});
  const [loaded, setLoaded] = useState(false);
  // Only the person acting counts as a change to upload — not loading or reloading.
  const edited = useRef(false);

  useEffect(() => {
    setProgress(loadProgress());
    setLoaded(true);
    const reload = () => {
      edited.current = false;
      setProgress(loadProgress());
    };
    window.addEventListener(DATA_REPLACED, reload);
    return () => window.removeEventListener(DATA_REPLACED, reload);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    saveProgress(progress, { silent: !edited.current });
  }, [progress, loaded]);

  /** Marks a course as started. Keeps the original start date and note if it was started before. */
  const start = useCallback((id: string) => {
    edited.current = true;
    setProgress((prev) => {
      const existing = prev[id];
      if (existing?.status === "in-progress") return { ...prev, [id]: { ...existing, updatedAt: now() } };
      if (existing?.status === "finished") return prev;
      const t = now();
      return { ...prev, [id]: { status: "in-progress", startedAt: t, updatedAt: t, note: "" } };
    });
  }, []);

  const finish = useCallback((id: string) => {
    edited.current = true;
    setProgress((prev) => {
      const t = now();
      const existing = prev[id];
      return {
        ...prev,
        [id]: {
          status: "finished",
          startedAt: existing?.startedAt ?? t,
          updatedAt: t,
          finishedAt: t,
          note: existing?.note ?? "",
        },
      };
    });
  }, []);

  const setNote = useCallback((id: string, note: string) => {
    edited.current = true;
    setProgress((prev) => (prev[id] ? { ...prev, [id]: { ...prev[id], note, updatedAt: now() } } : prev));
  }, []);

  /** Forget a course — back to "not started". */
  const reset = useCallback((id: string) => {
    edited.current = true;
    setProgress((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  return { progress, loaded, start, finish, setNote, reset };
}
