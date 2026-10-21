import { CloudCheck, CloudOff, LoaderCircle } from "lucide-react";
import { useAuth } from "../lib/auth";

const time = (d: Date) => d.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" });

/**
 * Tells a signed-in user whether their latest changes have reached their account.
 * `compact` shows just the icon (mobile header); the text stays available to screen readers.
 */
export function SyncBadge({ className = "", compact = false }: { className?: string; compact?: boolean }) {
  const { user, sync, lastSavedAt } = useAuth();
  if (!user || sync === "idle") return null;
  const states = {
    saving: { Icon: LoaderCircle, text: "Saving…", cls: "text-muted-foreground", spin: true },
    saved: {
      Icon: CloudCheck,
      text: lastSavedAt ? `Saved to your account · ${time(lastSavedAt)}` : "Saved to your account",
      cls: "text-success",
      spin: false,
    },
    offline: { Icon: CloudOff, text: "Offline — saved on this phone, will upload when you're back online", cls: "text-accent-foreground", spin: false },
  } as const;
  const { Icon, text, cls, spin } = states[sync];
  return (
    <span role="status" title={compact ? text : undefined}
      className={`inline-flex items-center gap-1.5 text-xs font-semibold ${cls} ${className}`}>
      <Icon className={`${compact ? "size-5" : "size-4"} shrink-0 ${spin ? "animate-spin" : ""}`} aria-hidden />
      <span className={compact ? "sr-only" : undefined}>{text}</span>
    </span>
  );
}
