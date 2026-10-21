import { Briefcase, HeartPulse, Laptop, Megaphone, Sprout, UserCheck, type LucideIcon } from "lucide-react";
import { SECTOR_INFO, type CourseSector } from "../lib/courses";

const ICONS: Record<CourseSector, LucideIcon> = {
  Tech: Laptop,
  Business: Briefcase,
  Marketing: Megaphone,
  Healthcare: HeartPulse,
  Agriculture: Sprout,
  "Job skills": UserCheck,
};

/** Rounded tile with the sector's icon on a tint of its color. */
export function SectorIcon({ sector, size = "md" }: { sector: CourseSector; size?: "sm" | "md" | "lg" }) {
  const Icon = ICONS[sector];
  const color = SECTOR_INFO[sector].color;
  const box = size === "lg" ? "size-14 rounded-xl" : size === "sm" ? "size-8 rounded-md" : "size-11 rounded-lg";
  const icon = size === "lg" ? "size-7" : size === "sm" ? "size-4" : "size-5";
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center ${box}`}
      style={{ color, background: `color-mix(in oklch, ${color} 12%, white)` }}
    >
      <Icon className={icon} strokeWidth={2.25} />
    </span>
  );
}
