import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * The lightest tour tier: the panorama as a plain image you swipe sideways. No WebGL, no
 * JavaScript libraries — works on any phone, and uses a smaller photo when one is provided.
 */
export function FlatPano({ src, alt }: { src: string; alt: string }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  // Start in the middle of the panorama (straight ahead).
  useEffect(() => {
    if (!loaded) return;
    const el = scroller.current;
    if (el) el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
  }, [loaded]);

  const nudge = (dir: 1 | -1) => scroller.current?.scrollBy({ left: dir * scroller.current.clientWidth * 0.6, behavior: "smooth" });
  const btn = "absolute top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-card/90 text-foreground shadow-card hover:bg-card";

  return (
    <div className="relative overflow-hidden rounded-xl bg-primary-deep">
      <div
        ref={scroller}
        className="h-[42vh] max-h-[420px] min-h-[220px] overflow-x-auto overflow-y-hidden overscroll-x-contain"
        tabIndex={0}
        aria-label={`${alt}. Panorama — scroll sideways to look around.`}
      >
        <img src={src} alt={alt} onLoad={() => setLoaded(true)} className="h-full w-auto max-w-none select-none" draggable={false} />
      </div>
      <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-primary-deep/70 px-3 py-1 text-xs font-semibold text-primary-foreground">
        Swipe sideways to look around
      </div>
      <button type="button" className={`${btn} left-3`} onClick={() => nudge(-1)} aria-label="Look left"><ChevronLeft className="size-5" /></button>
      <button type="button" className={`${btn} right-3`} onClick={() => nudge(1)} aria-label="Look right"><ChevronRight className="size-5" /></button>
    </div>
  );
}
