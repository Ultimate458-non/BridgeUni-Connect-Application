import { useCallback, useEffect, useRef, useState } from "react";
import { DATA_REPLACED, LOCAL_CHANGE, emit } from "./events";

export type Entry = { title: string; org: string; dates: string; details: string };
export type Certificate = { name: string; provider: string; year: string };

export type CV = {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  summary: string;
  /** Comma separated, e.g. "Excel, Customer service" */
  skills: string;
  experience: Entry[];
  education: Entry[];
  certificates: Certificate[];
};

export const STORAGE_KEY = "bridgeuni-cv";

export const emptyEntry = (): Entry => ({ title: "", org: "", dates: "", details: "" });

export const defaultCV = (): CV => ({
  name: "",
  email: "",
  phone: "",
  location: "Bloemfontein, Free State",
  linkedin: "",
  summary: "",
  skills: "",
  experience: [emptyEntry()],
  education: [emptyEntry()],
  certificates: [],
});

const str = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : fallback);

const toEntries = (v: unknown): Entry[] =>
  Array.isArray(v)
    ? v.map((e) => ({
        title: str(e?.title),
        org: str(e?.org),
        dates: str(e?.dates),
        details: str(e?.details),
      }))
    : [];

/** Turns untrusted data (localStorage, a backup file) into a valid CV, filling gaps with defaults. */
export function normalizeCV(input: unknown): CV {
  const base = defaultCV();
  const data = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const experience = toEntries(data.experience);
  const education = toEntries(data.education);
  return {
    name: str(data.name),
    email: str(data.email),
    phone: str(data.phone),
    location: str(data.location, base.location),
    linkedin: str(data.linkedin),
    summary: str(data.summary),
    skills: str(data.skills),
    experience: experience.length ? experience : base.experience,
    education: education.length ? education : base.education,
    certificates: Array.isArray(data.certificates)
      ? data.certificates.map((c: Partial<Certificate>) => ({
          name: str(c?.name),
          provider: str(c?.provider),
          year: str(c?.year),
        }))
      : [],
  };
}

/** Reads the CV from localStorage. Safe to call only in the browser (effects / event handlers). */
export function loadCV(): CV {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeCV(JSON.parse(raw)) : defaultCV();
  } catch {
    return defaultCV();
  }
}

/**
 * Writes the CV to localStorage. Skips identical writes. Unless `silent`, announces a user
 * change so a signed-in account can upload it.
 */
export function saveCV(cv: CV, { silent = false } = {}): void {
  try {
    const json = JSON.stringify(cv);
    if (window.localStorage.getItem(STORAGE_KEY) === json) return;
    window.localStorage.setItem(STORAGE_KEY, json);
  } catch {
    // Storage full or blocked (private mode) — the CV still works for this session.
    return;
  }
  if (!silent) emit(LOCAL_CHANGE);
}

export function splitSkills(skills: string): string[] {
  return skills
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Merges new skills into a comma string, skipping case-insensitive duplicates. */
export function mergeSkills(existing: string, add: string[]): string {
  const list = splitSkills(existing);
  const seen = new Set(list.map((s) => s.toLowerCase()));
  for (const skill of add) {
    const key = skill.trim().toLowerCase();
    if (key && !seen.has(key)) {
      seen.add(key);
      list.push(skill.trim());
    }
  }
  return list.join(", ");
}

/** The steps to a job-ready CV, in the order we suggest doing them. */
export function cvChecklist(cv: CV): { label: string; done: boolean }[] {
  const filled = (e: Entry) => [e.title, e.org].some((v) => v.trim());
  return [
    { label: "Add your name", done: !!cv.name.trim() },
    { label: "Add an email and phone number", done: !!cv.email.trim() && !!cv.phone.trim() },
    { label: "Write a 2–3 sentence summary", done: cv.summary.trim().length >= 60 },
    { label: "List at least 5 skills", done: splitSkills(cv.skills).length >= 5 },
    { label: "Add work or volunteering experience", done: cv.experience.some(filled) },
    { label: "Add your education", done: cv.education.some(filled) },
    { label: "Add a certificate", done: cv.certificates.length > 0 },
  ];
}

export function hasCertificate(cv: CV, name: string): boolean {
  const key = name.trim().toLowerCase();
  return cv.certificates.some((c) => c.name.trim().toLowerCase() === key);
}

/** Adds a finished course to the stored CV as a certificate plus skills. */
export function addCourseToCV(course: { name: string; provider: string; skills: string[] }): CV {
  const cv = loadCV();
  if (!hasCertificate(cv, course.name)) {
    cv.certificates.push({
      name: course.name,
      provider: course.provider,
      year: String(new Date().getFullYear()),
    });
  }
  cv.skills = mergeSkills(cv.skills, course.skills);
  saveCV(cv);
  return cv;
}

/**
 * CV state backed by localStorage.
 * Reads in an effect (never during render), and only starts saving after that first
 * read has finished, so the default empty CV can never overwrite stored data.
 */
export function useCV() {
  const [cv, setCV] = useState<CV>(defaultCV);
  const [loaded, setLoaded] = useState(false);
  // Only the person typing counts as a change to upload — not loading or reloading the CV.
  const edited = useRef(false);

  useEffect(() => {
    setCV(loadCV());
    setLoaded(true);
    const reload = () => {
      edited.current = false;
      setCV(loadCV());
    };
    window.addEventListener(DATA_REPLACED, reload);
    return () => window.removeEventListener(DATA_REPLACED, reload);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    saveCV(cv, { silent: !edited.current });
  }, [cv, loaded]);

  const update = useCallback(<K extends keyof CV>(key: K, value: CV[K]) => {
    edited.current = true;
    setCV((prev) => ({ ...prev, [key]: value }));
  }, []);

  return { cv, update, loaded };
}
