import { CircleCheck, X } from "lucide-react";
import { useEffect } from "react";
import { useAuth } from "../lib/auth";

/** One-off reassurance messages from the account layer (e.g. "we kept your changes"). */
export function NoticeToast() {
  const { notice, dismissNotice } = useAuth();

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(dismissNotice, 8000);
    return () => clearTimeout(t);
  }, [notice, dismissNotice]);

  if (!notice) return null;
  return (
    <div className="no-print fixed inset-x-4 bottom-24 z-50 lg:bottom-4 mx-auto flex max-w-md items-start gap-3 rounded-lg border border-success/30 bg-card p-4 shadow-lift" role="status">
      <CircleCheck className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
      <p className="flex-1 text-sm font-semibold">{notice}</p>
      <button type="button" onClick={dismissNotice} className="-m-2 flex size-10 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted" aria-label="Dismiss">
        <X className="size-4" />
      </button>
    </div>
  );
}
