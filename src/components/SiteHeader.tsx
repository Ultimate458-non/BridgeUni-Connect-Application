import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronDown, CloudUpload, LogOut, Menu, User as UserIcon, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../lib/auth";
import { displayIdentifier } from "../lib/identifier";
import { useLogout } from "../lib/use-logout";
import { Logo } from "./Logo";
import { SyncBadge } from "./SyncBadge";

const links = [
  { to: "/discover", label: "Discover" },
  { to: "/certify", label: "Certify" },
  { to: "/cv", label: "My CV" },
  { to: "/varsities", label: "Campus tours" },
] as const;

const initial = (name: string, fallback: string) => (name.trim()[0] ?? fallback[0] ?? "?").toUpperCase();

export function SiteHeader() {
  const { user, ready } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const logout = useLogout();

  // Close the mobile menu after navigating.
  useEffect(() => setMenuOpen(false), [pathname]);

  return (
    <header className="no-print sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/85">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 btn-solid">
        Skip to content
      </a>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link to="/" aria-label="BridgeUni home" className="inline-flex min-h-11 items-center rounded-md">
          <Logo />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="rounded-md px-3 py-2.5 text-[0.9375rem] font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              activeProps={{ className: "!text-primary bg-primary-soft", "aria-current": "page" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {!ready ? (
            <span className="h-10 w-40" aria-hidden />
          ) : user ? (
            <>
              <SyncBadge />
              <AccountMenu onLogout={logout} />
            </>
          ) : (
            <>
              <Link to="/login" className="rounded-md px-3 py-2.5 text-[0.9375rem] font-bold text-foreground hover:text-primary">
                Log in
              </Link>
              <Link to="/signup" className="btn-solid min-h-10 py-2">Sign up free</Link>
            </>
          )}
        </div>

        <SyncBadge compact className="ml-auto -mr-2 md:hidden" />
        <button
          type="button"
          className="inline-flex size-11 items-center justify-center rounded-md text-foreground hover:bg-muted md:hidden"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>

      {menuOpen && (
        <div id="mobile-menu" className="border-t border-border bg-background px-4 pb-5 pt-2 shadow-lift md:hidden">
          <nav aria-label="Main" className="flex flex-col">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="rounded-md px-3 py-3 text-base font-semibold hover:bg-muted"
                activeProps={{ className: "text-primary bg-primary-soft", "aria-current": "page" }}
              >
                {l.label}
              </Link>
            ))}
            {user && (
              <>
                <Link to="/account" className="rounded-md px-3 py-3 text-base font-semibold hover:bg-muted"
                  activeProps={{ className: "text-primary bg-primary-soft", "aria-current": "page" }}>
                  My account
                </Link>
                <Link to="/backup" className="rounded-md px-3 py-3 text-base font-semibold hover:bg-muted"
                  activeProps={{ className: "text-primary bg-primary-soft", "aria-current": "page" }}>
                  Backup &amp; move
                </Link>
              </>
            )}
          </nav>
          <div className="mt-3 border-t border-border pt-4">
            {user ? (
              <div className="flex flex-col gap-3">
                <p className="px-3 text-sm text-muted-foreground">
                  Logged in as <strong className="text-foreground">{user.name || displayIdentifier(user)}</strong>
                </p>
                <SyncBadge className="px-3" />
                <button type="button" className="btn-ghost" onClick={logout}>
                  <LogOut className="size-4" aria-hidden /> Log out
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Link to="/login" className="btn-ghost">Log in</Link>
                <Link to="/signup" className="btn-solid">Sign up free</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

function AccountMenu({ onLogout }: { onLogout: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) return null;
  const who = displayIdentifier(user);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className="flex items-center gap-2 rounded-full border border-border py-1 pl-1 pr-3 text-sm font-semibold hover:border-border-strong hover:bg-muted"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
          {initial(user.name, who)}
        </span>
        <span className="max-w-32 truncate">{user.name || "My account"}</span>
        <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-64 overflow-hidden rounded-lg border border-border bg-card shadow-lift">
          <div className="border-b border-border px-4 py-3">
            <p className="truncate text-sm font-bold">{user.name || "BridgeUni member"}</p>
            <p className="truncate text-xs text-muted-foreground">{who}</p>
          </div>
          <Link role="menuitem" to="/account" className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold hover:bg-muted">
            <UserIcon className="size-4 text-muted-foreground" aria-hidden /> My account
          </Link>
          <Link role="menuitem" to="/backup" className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold hover:bg-muted">
            <CloudUpload className="size-4 text-muted-foreground" aria-hidden /> Backup &amp; move
          </Link>
          <button role="menuitem" type="button" onClick={onLogout}
            className="flex w-full items-center gap-2 border-t border-border px-4 py-2.5 text-left text-sm font-semibold hover:bg-muted">
            <LogOut className="size-4 text-muted-foreground" aria-hidden /> Log out
          </button>
        </div>
      )}
    </div>
  );
}
