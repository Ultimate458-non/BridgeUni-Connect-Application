import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthLayout, FormError, PasswordField, safeRedirect, TextField } from "../components/AuthForm";
import { ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { identifierError, PASSWORD_MIN, passwordError } from "../lib/identifier";

const TITLE = "Sign up free · BridgeUni";
const DESCRIPTION = "Create a free BridgeUni account with your cell number or email. Keep your CV and course progress safe and use them on any phone.";

export const Route = createFileRoute("/signup")({
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
  component: SignupPage,
});

function SignupPage() {
  const { signup, user, ready } = useAuth();
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ identifier?: string | null; password?: string | null; form?: string | null; exists?: boolean }>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && user) void navigate({ to: safeRedirect(redirect), replace: true });
  }, [ready, user, redirect, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const idErr = identifierError(identifier);
    const pwErr = passwordError(password, identifier);
    if (idErr || pwErr) return setErrors({ identifier: idErr, password: pwErr });
    setBusy(true);
    setErrors({});
    try {
      await signup({ identifier, password, name });
      // The effect above navigates once `user` is set.
    } catch (err) {
      if (err instanceof ApiError && (err.field === "identifier" || err.field === "password"))
        setErrors({ [err.field]: err.message, exists: err.code === "exists" });
      else setErrors({ form: err instanceof Error ? err.message : "Something went wrong." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Create your free account"
      subtitle={<>Already have one? <Link to="/login" search={redirect ? { redirect } : {}} className="link">Log in</Link></>}
    >
      <form className="space-y-5" onSubmit={submit} noValidate>
        {errors.form && <FormError>{errors.form}</FormError>}
        <TextField
          label="Your name"
          hint="Optional — so we can greet you."
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <TextField
          label="Cell number or email"
          hint="Use what you check most. e.g. 071 234 5678"
          autoComplete="username"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          onBlur={() => identifier && setErrors((s) => ({ ...s, identifier: identifierError(identifier) }))}
          error={errors.identifier}
          required
        />
        {errors.exists && (
          <p className="-mt-3 text-sm">
            <Link to="/login" search={redirect ? { redirect } : {}} className="link">Log in to that account →</Link>
          </p>
        )}
        <PasswordField
          hint={`At least ${PASSWORD_MIN} characters. Not your phone number, and not something easy like “password1”.`}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          required
        />
        <button type="submit" className="btn-solid w-full" disabled={busy}>
          {busy ? "Creating your account…" : "Create my free account"}
        </button>
        <p className="text-xs text-muted-foreground">
          We only use your details to keep your CV and progress safe — we never sell them or send you adverts.
        </p>
      </form>
    </AuthLayout>
  );
}
