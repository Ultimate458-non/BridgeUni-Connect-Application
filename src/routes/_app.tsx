import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { LoaderCircle } from "lucide-react";
import { useEffect } from "react";
import { useAuth } from "../lib/auth";

/**
 * Every page under here (CV builder, courses, backup, account) needs a logged-in account.
 * Visitors are sent to log in and come back to where they were going afterwards.
 */
export const Route = createFileRoute("/_app")({
  component: RequireAccount,
});

function RequireAccount() {
  const { user, ready, signedOut } = useAuth();
  const navigate = useNavigate();
  const location = useRouterState({ select: (s) => s.location });
  // This layout can stay mounted for a moment after we navigate away; never redirect from the
  // auth pages themselves, or the redirect would wrap itself (/login?redirect=/login?redirect=…).
  const onAuthPage = location.pathname === "/login" || location.pathname === "/signup";
  const target = location.href;

  useEffect(() => {
    if (!ready || user || onAuthPage) return;
    // Just logged out on purpose → home (useLogout / delete handle that). Otherwise → log in.
    if (signedOut === "logout") void navigate({ to: "/", replace: true });
    else void navigate({ to: "/login", search: { redirect: target }, replace: true });
  }, [ready, user, signedOut, onAuthPage, target, navigate]);

  if (!ready || !user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center" aria-busy="true">
        <LoaderCircle className="size-8 animate-spin text-primary" aria-label="Loading" />
      </div>
    );
  }
  return <Outlet />;
}
