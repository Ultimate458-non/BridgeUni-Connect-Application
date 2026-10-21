import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthLayout, FormError, PasswordField, safeRedirect, TextField } from "../components/AuthForm";
import { useAuth } from "../lib/auth";
import { identifierError } from "../lib/identifier";

const TITLE = "Log in · BridgeUni";
const DESCRIPTION = "Log in to BridgeUni with your cell number or email to get your CV and course progress on this phone.";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string } =>
    typeof s.redirect === "string" ? { redirect: s.redirect } : {},
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { login, user, ready, signedOut } = useAuth();
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [idError, setIdError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  useEffect(() => {
    if (ready && user) void navigate({ to: safeRedirect(redirect, "/"), replace: true }); // back to their dashboard
  }, [ready, user, redirect, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const idErr = identifierError(identifier);
    setIdError(idErr);
    if (idErr) return;
    if (!password) return setError("Enter your password.");
    setBusy(true);
    setError(null);
    try {
      await login({ identifier, password });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle={<>New here? <Link to="/signup" search={redirect ? { redirect } : {}} className="link">Create a free account</Link></>}
    >
      <form className="space-y-5" onSubmit={submit} noValidate>
        {!error && (signedOut === "expired" || redirect) && (
          <div role="status" className="rounded-md border border-primary/20 bg-primary-soft px-4 py-3 text-sm">
            {signedOut === "expired" ? (
              <><strong>You've been logged out</strong> to keep your CV safe. Log in again to carry on.</>
            ) : (
              <><strong>Log in to continue.</strong> Your CV and courses are private to your account.</>
            )}
          </div>
        )}
        {error && <FormError>{error}</FormError>}
        <TextField
          label="Cell number or email"
          autoComplete="username"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          error={idError}
          required
        />
        <PasswordField
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" className="btn-solid w-full" disabled={busy}>
          {busy ? "Logging in…" : "Log in"}
        </button>
        <div className="text-center">
          <button type="button" className="link min-h-10 text-sm" onClick={() => setShowForgot((s) => !s)} aria-expanded={showForgot}>
            Forgot your password?
          </button>
          {showForgot && (
            <p className="mt-3 rounded-md bg-muted p-3 text-left text-sm">
              We can't send reset messages yet. If you have a backup file or code, create a new account and restore
              it on the <Link to="/backup" className="link">Backup &amp; move</Link> page.
            </p>
          )}
        </div>
      </form>
      <div className="mt-6 border-t border-border pt-5">
        <p className="text-center text-sm text-muted-foreground">New to BridgeUni?</p>
        <Link to="/signup" search={redirect ? { redirect } : {}} className="btn-ghost mt-2 w-full">
          Create a free account
        </Link>
      </div>
      <p className="mt-5 text-center text-xs text-muted-foreground">
        On a shared or café computer? <strong>Log out when you're done</strong> — it clears your CV from this device.
      </p>
    </AuthLayout>
  );
}
