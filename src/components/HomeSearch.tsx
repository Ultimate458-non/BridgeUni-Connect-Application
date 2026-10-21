import { Link, useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useId, useState } from "react";

/** "What do you want to learn?" search + popular shortcuts, on a blue background. */
export function HomeSearch({ className = "" }: { className?: string }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const id = useId();
  const chip = "inline-flex min-h-10 shrink-0 items-center whitespace-nowrap rounded-full bg-primary-foreground/15 px-3.5 font-semibold hover:bg-primary-foreground/25";
  return (
    <div className={className}>
      <form
        role="search"
        className="flex max-w-xl gap-2 rounded-xl bg-card p-1.5 shadow-lift"
        onSubmit={(e) => {
          e.preventDefault();
          void navigate({ to: "/courses", search: q.trim() ? { q: q.trim() } : {} });
        }}
      >
        <label htmlFor={id} className="sr-only">Search free courses</label>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            id={id}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search courses"
            className="h-12 w-full rounded-lg bg-transparent pl-10 pr-2 text-base text-foreground placeholder:text-placeholder focus:outline-none"
          />
        </div>
        <button type="submit" className="btn-solid h-12 px-4 sm:px-5">Search</button>
      </form>
      {/* One row; on the narrowest phones it scrolls sideways instead of wrapping. */}
      <div className="-mx-4 mt-3 flex items-center gap-2 overflow-x-auto px-4 pb-1 text-sm sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        <span className="shrink-0 opacity-80 max-sm:sr-only">Popular:</span>
        <Link to="/courses" search={{ q: "marketing" }} className={chip}>Marketing</Link>
        <Link to="/courses" search={{ sector: "Agriculture" }} className={chip}>Agriculture</Link>
        <Link to="/varsities" className={chip}>Campus tours</Link>
      </div>
    </div>
  );
}
