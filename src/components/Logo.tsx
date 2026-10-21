/**
 * BridgeUni logo. `mark` = the bridge symbol + wordmark (header); `full` = the complete logo with
 * the tagline, on a white tile so it reads on dark backgrounds too (footer).
 */
export function Logo({ variant = "mark" }: { variant?: "mark" | "full" }) {
  if (variant === "full") {
    return (
      <span className="inline-block rounded-xl bg-card px-4 py-3">
        <img
          src="/brand/logo-full.png"
          alt="BridgeUni — Connecting vision to information"
          width={220}
          height={107}
          className="h-auto w-[220px]"
        />
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2">
      <img src="/brand/logo-mark.png" alt="" width={62} height={21} className="h-[21px] w-[62px] shrink-0" />
      <span className="font-display text-[1.15rem] font-extrabold uppercase leading-none tracking-[0.14em]">
        <span className="text-brand-navy">Bridge</span>
        <span className="text-brand-blue">Uni</span>
      </span>
    </span>
  );
}
