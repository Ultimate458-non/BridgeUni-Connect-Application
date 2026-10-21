import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "./auth";

/** Logs out, warning first if some changes never reached the account (e.g. offline). */
export function useLogout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  return async () => {
    let done = await logout();
    if (!done) {
      const force = window.confirm(
        "Some changes haven't reached your account yet — you seem to be offline.\n\nLog out anyway? Those changes will be lost from this phone.",
      );
      if (!force) return;
      done = await logout({ force: true });
    }
    if (done) void navigate({ to: "/" });
  };
}
