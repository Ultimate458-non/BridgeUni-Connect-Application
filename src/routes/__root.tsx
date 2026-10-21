import {
  HeadContent,
  Link,
  Outlet,
  createRootRoute,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { ConflictDialog } from "../components/ConflictDialog";
import { NoticeToast } from "../components/NoticeToast";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";

export const Route = createRootRoute({
  head: () => ({
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Nunito:wght@700;800;900&family=Nunito+Sans:opsz,wght@6..12,400;6..12,600;6..12,700&display=swap",
      },
    ],
  }),
  component: RootLayout,
  notFoundComponent: NotFound,
  errorComponent: ErrorPage,
});

function RootLayout() {
  return (
    <>
      <HeadContent />
      <div className="flex min-h-dvh flex-col">
        <SiteHeader />
        <main id="main" className="flex-1">
          <Outlet />
        </main>
        <SiteFooter />
      </div>
      <ConflictDialog />
      <NoticeToast />
    </>
  );
}

function Message({ tag, title, body, children }: { tag: string; title: string; body: string; children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-xl px-4 py-20 text-center">
      <span className="tag">{tag}</span>
      <h1 className="mt-4 text-3xl font-extrabold sm:text-4xl">{title}</h1>
      <p className="mt-3 text-muted-foreground">{body}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">{children}</div>
    </section>
  );
}

function NotFound() {
  return (
    <>
      <title>Page not found · BridgeUni</title>
      <Message tag="404" title="We can't find that page" body="The link may be old or mistyped. Your CV is still safe.">
        <Link to="/cv" className="btn-solid">Go to my CV</Link>
        <Link to="/" className="btn-ghost">Home</Link>
      </Message>
    </>
  );
}

function ErrorPage({ error, reset }: ErrorComponentProps) {
  return (
    <>
      <title>Something went wrong · BridgeUni</title>
      <Message tag="Error" title="Something went wrong" body="Your CV is saved, so it should still be there. Try again, or reload the page.">
        <button type="button" className="btn-solid" onClick={reset}>Try again</button>
        <Link to="/" className="btn-ghost">Home</Link>
      </Message>
      {import.meta.env.DEV && (
        <pre className="mx-auto mb-10 max-w-xl overflow-x-auto rounded-md bg-muted p-3 text-xs">
          {error instanceof Error ? error.message : String(error)}
        </pre>
      )}
    </>
  );
}
