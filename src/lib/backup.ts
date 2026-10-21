// Backup & restore — moves the CV and course progress between devices with no server.
// A backup is a small JSON file, or the same data as a copy-paste text code.

import { COURSES } from "./courses";
import { loadCV, normalizeCV, saveCV, type CV } from "./cv-store";
import { loadProgress, normalizeProgress, saveProgress, type Progress } from "./progress-store";

const APP = "bridgeuni";
const VERSION = 1;
const CODE_PREFIX = "BRIDGEUNI1.";

export type Backup = { exportedAt: string; cv: CV; progress: Progress };

export type BackupSummary = {
  name: string;
  certificates: number;
  inProgress: number;
  finished: number;
  isEmpty: boolean;
};

export function createBackup(): Backup {
  return { exportedAt: new Date().toISOString(), cv: loadCV(), progress: loadProgress() };
}

export function summarize({ cv, progress }: Pick<Backup, "cv" | "progress">): BackupSummary {
  const known = Object.entries(progress).filter(([id]) => COURSES.some((c) => c.id === id));
  const inProgress = known.filter(([, p]) => p.status === "in-progress").length;
  const finished = known.filter(([, p]) => p.status === "finished").length;
  const hasEntries = [...cv.experience, ...cv.education].some((e) =>
    [e.title, e.org, e.dates, e.details].some((v) => v.trim()),
  );
  const isEmpty =
    !cv.name.trim() && !cv.email.trim() && !cv.phone.trim() && !cv.summary.trim() && !cv.skills.trim() &&
    !hasEntries && cv.certificates.length === 0 && inProgress + finished === 0;
  return { name: cv.name.trim(), certificates: cv.certificates.length, inProgress, finished, isEmpty };
}

const toJSON = (b: Backup) =>
  JSON.stringify({ app: APP, version: VERSION, exportedAt: b.exportedAt, cv: b.cv, progress: b.progress });

/* ---------- base64url of UTF-8 text (names can have accents / emoji) ---------- */

function encode(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decode(code: string): string {
  const b64 = code.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export function toCode(b: Backup): string {
  return CODE_PREFIX + encode(toJSON(b));
}

export class BackupError extends Error {}

/** Accepts either a backup file's contents or a pasted backup code. Throws BackupError with a friendly message. */
export function parseBackup(input: string): Backup {
  const text = input.trim();
  if (!text) throw new BackupError("Paste your backup code first.");

  let json: string;
  const at = text.indexOf(CODE_PREFIX);
  if (at >= 0) {
    // WhatsApp and email can add spaces or line breaks — strip everything that isn't base64url.
    const body = text.slice(at + CODE_PREFIX.length).replace(/[^A-Za-z0-9_-]/g, "");
    try {
      json = decode(body);
    } catch {
      throw new BackupError("That code looks cut off or changed. Copy the whole code again and paste it.");
    }
  } else if (text.startsWith("{")) {
    json = text;
  } else {
    throw new BackupError("That isn't a BridgeUni backup. A backup code starts with “BRIDGEUNI1.”");
  }

  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new BackupError("That code looks cut off or changed. Copy the whole code again and paste it.");
  }
  const d = data as { app?: unknown; version?: unknown; exportedAt?: unknown; cv?: unknown; progress?: unknown };
  if (!d || d.app !== APP) throw new BackupError("That file isn't a BridgeUni backup.");
  if (typeof d.version !== "number" || d.version > VERSION)
    throw new BackupError("This backup was made by a newer version of BridgeUni. Refresh the page and try again.");

  return {
    exportedAt: typeof d.exportedAt === "string" ? d.exportedAt : "",
    cv: normalizeCV(d.cv),
    progress: normalizeProgress(d.progress),
  };
}

/** Replaces the CV and progress on this device with the backup. */
export function restoreBackup(b: Backup): void {
  saveCV(b.cv);
  saveProgress(b.progress);
}

/* ---------- Getting the file off the phone ---------- */

export function backupFileName(b: Backup): string {
  const day = b.exportedAt.slice(0, 10) || "backup";
  const who = b.cv.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `bridgeuni-${who ? who + "-" : ""}${day}.json`;
}

function backupFile(b: Backup): File {
  return new File([toJSON(b)], backupFileName(b), { type: "application/json" });
}

export function downloadBackup(b: Backup): void {
  const url = URL.createObjectURL(backupFile(b));
  const a = document.createElement("a");
  a.href = url;
  a.download = backupFileName(b);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** True where the phone's share sheet can send files (most Android Chrome). */
export function canShareFile(): boolean {
  try {
    const probe = new File(["{}"], "probe.json", { type: "application/json" });
    return typeof navigator.canShare === "function" && navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

/** Opens the share sheet (WhatsApp, email, Drive…). Returns false if the user cancelled. */
export async function shareBackup(b: Backup): Promise<boolean> {
  try {
    await navigator.share({
      files: [backupFile(b)],
      title: "My BridgeUni backup",
      text: `My BridgeUni CV and course progress. To restore it, open ${window.location.origin}/backup`,
    });
    return true;
  } catch {
    return false;
  }
}
