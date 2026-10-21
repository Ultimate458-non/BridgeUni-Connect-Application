import { CircleCheck, Eye, EyeOff } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

/** Two-column auth layout: form card + reasons to sign up. */
export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: ReactNode; children: ReactNode }) {
  return (
    <div className="bg-surface">
      <div className="mx-auto grid max-w-5xl gap-10 px-4 py-10 sm:py-16 lg:grid-cols-[1fr_0.9fr] lg:items-center">
        <div className="panel mx-auto w-full max-w-md p-6 sm:p-8">
          <h1 className="text-2xl font-extrabold sm:text-3xl">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
        <aside className="hidden lg:block">
          <h2 className="text-2xl font-extrabold">Your account protects your work</h2>
          <ul className="mt-5 space-y-4">
            {[
              ["Private to you", "Your CV and progress sit behind your password, not on a shared computer."],
              ["Your CV, on any phone", "Log in at an internet café or on a new phone and carry on. Log out and nothing stays behind."],
              ["Courses where you left off", "Your started and finished courses, and your notes, stay with you."],
              ["Free, forever", "No fees and no adverts. We never sell your data."],
            ].map(([t, b]) => (
              <li key={t} className="flex gap-3">
                <CircleCheck className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
                <p><strong>{t}</strong><br /><span className="text-sm text-muted-foreground">{b}</span></p>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}

/** Labelled input with an error message wired up for screen readers. */
export function TextField({
  label,
  hint,
  error,
  ...input
}: { label: string; hint?: ReactNode; error?: string | null } & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errId = `${id}-err`;
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <input
        id={id}
        className="field"
        aria-invalid={error ? true : undefined}
        aria-describedby={[hint && hintId, error && errId].filter(Boolean).join(" ") || undefined}
        {...input}
      />
      {hint && !error && <p id={hintId} className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
      {error && <p id={errId} className="mt-1.5 text-sm font-semibold text-danger">{error}</p>}
    </div>
  );
}

export function PasswordField({
  label = "Password",
  hint,
  error,
  ...input
}: { label?: string; hint?: ReactNode; error?: string | null } & React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  const id = useId();
  const hintId = `${id}-hint`;
  const errId = `${id}-err`;
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          className="field pr-12"
          aria-invalid={error ? true : undefined}
          aria-describedby={[hint && hintId, error && errId].filter(Boolean).join(" ") || undefined}
          {...input}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-1 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
        >
          {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
        </button>
      </div>
      {hint && !error && <p id={hintId} className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
      {error && <p id={errId} className="mt-1.5 text-sm font-semibold text-danger">{error}</p>}
    </div>
  );
}

export function FormError({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="rounded-md border border-danger/30 bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
      {children}
    </div>
  );
}

/** Only allow redirects to our own pages. */
export const safeRedirect = (r: unknown, fallback = "/cv"): string =>
  typeof r === "string" && r.startsWith("/") && !r.startsWith("//") ? r : fallback;
