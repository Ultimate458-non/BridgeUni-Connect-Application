import { Cloud, Smartphone } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../lib/auth";
import type { BackupSummary } from "../lib/backup";
import { formatDay } from "../lib/progress-store";

/**
 * Shown when this phone and the account hold different CVs — another phone saved while this one
 * had unsent edits, or old data was left on this phone. The person chooses; nothing is overwritten silently.
 */
export function ConflictDialog() {
  const { conflict, resolveConflict } = useAuth();
  const [busy, setBusy] = useState(false);
  const firstButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (conflict) firstButton.current?.focus();
  }, [conflict]);

  if (!conflict) return null;

  const choose = async (keep: "account" | "device") => {
    setBusy(true);
    await resolveConflict(keep);
    setBusy(false);
  };

  return (
    <div className="no-print fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-4 sm:items-center">
      <div role="dialog" aria-modal="true" aria-labelledby="conflict-title" className="panel w-full max-w-lg p-6 shadow-lift">
        <h2 id="conflict-title" className="text-xl font-extrabold">Which CV do you want to keep?</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          There's a CV on this phone and a different one in your account. Pick one — the other will be replaced.
        </p>
        <div className="mt-5 grid gap-3">
          <Choice
            buttonRef={firstButton}
            icon={<Cloud className="size-5" aria-hidden />}
            title="Use my account's CV"
            subtitle={conflict.accountUpdatedAt ? `Last saved ${formatDay(conflict.accountUpdatedAt)}` : undefined}
            summary={conflict.account}
            onClick={() => choose("account")}
            disabled={busy}
          />
          <Choice
            icon={<Smartphone className="size-5" aria-hidden />}
            title="Use the CV on this phone"
            subtitle="Replaces what's in your account"
            summary={conflict.device}
            onClick={() => choose("device")}
            disabled={busy}
          />
        </div>
      </div>
    </div>
  );
}

function Choice({
  icon,
  title,
  subtitle,
  summary,
  onClick,
  disabled,
  buttonRef,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  summary: BackupSummary;
  onClick: () => void;
  disabled: boolean;
  buttonRef?: React.Ref<HTMLButtonElement>;
}) {
  const bits = [
    summary.name ? `CV for ${summary.name}` : "CV with no name",
    `${summary.certificates} certificate${summary.certificates === 1 ? "" : "s"}`,
    summary.inProgress + summary.finished > 0 && `${summary.inProgress + summary.finished} course${summary.inProgress + summary.finished === 1 ? "" : "s"} tracked`,
  ].filter(Boolean);
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-start gap-3 rounded-lg border border-border-strong p-4 text-left transition-colors hover:border-primary hover:bg-primary-soft disabled:opacity-60"
    >
      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">{icon}</span>
      <span>
        <span className="block font-bold">{title}</span>
        {subtitle && <span className="block text-xs text-muted-foreground">{subtitle}</span>}
        <span className="mt-1 block text-sm">{bits.join(" · ")}</span>
      </span>
    </button>
  );
}
