import { Link } from "@tanstack/react-router";
import { LINKEDIN_GUIDE_URL } from "../lib/courses";
import { Logo } from "./Logo";

export function SiteFooter() {
  return (
    <footer className="no-print bg-primary-deep text-primary-foreground">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <Logo variant="full" />
          <p className="mt-3 max-w-sm text-sm opacity-80">
            Free CVs that get past hiring filters, and free courses that make them stronger. Built for young job
            seekers in Mangaung.
          </p>
        </div>
        <FooterCol title="Get started">
          <FooterLink to="/cv">CV builder</FooterLink>
          <FooterLink to="/courses">Free courses</FooterLink>
          <li>
            <a href={LINKEDIN_GUIDE_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center opacity-80 hover:underline hover:opacity-100">
              LinkedIn profile guide ↗
            </a>
          </li>
        </FooterCol>
        <FooterCol title="Your account">
          <FooterLink to="/signup">Sign up free</FooterLink>
          <FooterLink to="/login">Log in</FooterLink>
          <FooterLink to="/backup">Backup &amp; move</FooterLink>
        </FooterCol>
      </div>
      <div className="border-t border-primary-foreground/15">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-5 text-xs opacity-75 sm:flex-row sm:justify-between">
          <p>BridgeUni by AccessX · BizTech Nexus Hackathon 2026</p>
          <p>Free for youth, forever. We never sell your data.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-bold uppercase tracking-wider opacity-70">{title}</h2>
      <ul className="mt-2 text-sm">{children}</ul>
    </div>
  );
}

function FooterLink({ to, children }: { to: "/cv" | "/courses" | "/signup" | "/login" | "/backup"; children: React.ReactNode }) {
  return (
    <li>
      <Link to={to} className="inline-flex min-h-10 min-w-10 items-center opacity-80 hover:underline hover:opacity-100">{children}</Link>
    </li>
  );
}
