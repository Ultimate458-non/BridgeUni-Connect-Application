import { createFileRoute, Link } from "@tanstack/react-router";
import { CloudUpload, LogOut } from "lucide-react";
import { useState, type ReactNode } from "react";
import { FormError, PasswordField, TextField } from "../../components/AuthForm";
import { SyncBadge } from "../../components/SyncBadge";
import { ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { displayIdentifier, PASSWORD_MIN, passwordError } from "../../lib/identifier";
import { formatDay } from "../../lib/progress-store";
import { useLogout } from "../../lib/use-logout";

const TITLE = "My account · BridgeUni";
const DESCRIPTION = "Manage your free BridgeUni account: your name, password and data.";

export const Route = createFileRoute("/_app/account")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const { user } = useAuth();
  const logout = useLogout();
  if (!user) return null; // the _app layout guarantees a user; this keeps TypeScript happy

  return (
    <div className="bg-surface">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold sm:text-4xl">My account</h1>
            <p className="mt-1 text-muted-foreground">Member since {formatDay(user.createdAt)}</p>
          </div>
          <SyncBadge />
        </div>

        <div className="mt-8 space-y-6">
          <ProfileCard />
          <Card title="Your CV and courses">
            <p className="text-sm text-muted-foreground">
              Saved to your account automatically. Log in on any phone to carry on.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link to="/cv" className="btn-solid">Open my CV</Link>
              <Link to="/courses" className="btn-ghost">My courses</Link>
              <Link to="/backup" className="btn-ghost"><CloudUpload className="size-4" aria-hidden /> Download a backup</Link>
            </div>
          </Card>
          <PasswordCard />
          <Card title="Log out">
            <p className="text-sm text-muted-foreground">
              Logging out removes your CV from this device. It stays safe in your account.
            </p>
            <button type="button" className="btn-ghost mt-4" onClick={logout}>
              <LogOut className="size-4" aria-hidden /> Log out
            </button>
          </Card>
          <DeleteCard />
        </div>
      </div>
    </div>
  );
}

function Card({ title, children, tone }: { title: string; children: ReactNode; tone?: "danger" }) {
  return (
    <section className={`panel p-6 ${tone === "danger" ? "border-danger/40" : ""}`} aria-label={title}>
      <h2 className={`text-lg font-extrabold ${tone === "danger" ? "text-danger" : ""}`}>{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function ProfileCard() {
  const { user, updateName } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!user) return null;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await updateName(name);
      setStatus("Saved ✓");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save.");
    }
  };

  return (
    <Card title="Profile">
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <TextField label="Your name" value={name} autoComplete="name"
          onChange={(e) => { setName(e.target.value); setStatus(null); }} />
        <div>
          <p className="label">{user.kind === "phone" ? "Cell number" : "Email"}</p>
          <p className="flex min-h-11 items-center rounded-md bg-muted px-3.5 text-muted-foreground">{displayIdentifier(user)}</p>
        </div>
        <div className="flex items-center gap-3 sm:col-span-2">
          <button type="submit" className="btn-solid" disabled={name.trim() === user.name}>Save name</button>
          <span aria-live="polite" className="text-sm font-semibold text-success">{status}</span>
        </div>
        {error && <div className="sm:col-span-2"><FormError>{error}</FormError></div>}
      </form>
    </Card>
  );
}

function PasswordCard() {
  const { changePassword, user } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [errors, setErrors] = useState<{ current?: string | null; next?: string | null; form?: string | null }>({});
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErr = passwordError(next, user?.identifier);
    if (!current || nextErr) return setErrors({ current: current ? null : "Enter your current password.", next: nextErr });
    setBusy(true);
    setErrors({});
    try {
      await changePassword(current, next);
      setDone(true);
      setCurrent("");
      setNext("");
    } catch (err) {
      if (err instanceof ApiError && (err.field === "current" || err.field === "next")) setErrors({ [err.field]: err.message });
      else setErrors({ form: err instanceof Error ? err.message : "Couldn't change it." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="Change password">
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        {errors.form && <div className="sm:col-span-2"><FormError>{errors.form}</FormError></div>}
        <PasswordField label="Current password" autoComplete="current-password" value={current}
          onChange={(e) => { setCurrent(e.target.value); setDone(false); }} error={errors.current} />
        <PasswordField label="New password" autoComplete="new-password" value={next}
          hint={`At least ${PASSWORD_MIN} characters.`}
          onChange={(e) => { setNext(e.target.value); setDone(false); }} error={errors.next} />
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <button type="submit" className="btn-solid" disabled={busy}>{busy ? "Changing…" : "Change password"}</button>
          <span aria-live="polite" className="text-sm font-semibold text-success">
            {done && "Password changed ✓ Other devices have been logged out."}
          </span>
        </div>
      </form>
    </Card>
  );
}

function DeleteCard() {
  const { deleteAccount } = useAuth();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await deleteAccount(password); // the page then sends you home
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete the account.");
      setBusy(false);
    }
  };

  return (
    <Card title="Delete account" tone="danger">
      <p className="text-sm text-muted-foreground">
        Permanently deletes your account, CV and course progress from BridgeUni. This can't be undone.{" "}
        <Link to="/backup" className="link">Download a backup first</Link> if you want to keep your CV.
      </p>
      {!open ? (
        <button type="button" className="btn-ghost mt-4 border-danger/40 text-danger hover:border-danger hover:bg-danger-soft hover:text-danger" onClick={() => setOpen(true)}>
          Delete my account…
        </button>
      ) : (
        <form onSubmit={submit} className="mt-4 space-y-4 rounded-md bg-danger-soft p-4">
          <PasswordField label="Type your password to confirm" autoComplete="current-password" value={password}
            onChange={(e) => setPassword(e.target.value)} error={error} autoFocus />
          <div className="flex flex-wrap gap-3">
            <button type="submit" className="btn-solid border-danger bg-danger hover:border-danger hover:bg-danger/90" disabled={!password || busy}>
              {busy ? "Deleting…" : "Delete forever"}
            </button>
            <button type="button" className="btn-ghost" onClick={() => { setOpen(false); setPassword(""); setError(null); }}>Cancel</button>
          </div>
        </form>
      )}
    </Card>
  );
}
