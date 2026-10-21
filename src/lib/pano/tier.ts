// Picks the richest tour experience this device can handle without wasting data or battery.
//   xr   — WebXR headset / VR-capable browser: immersive 360°
//   360  — WebGL: drag (or tilt) to look around inside the photo
//   flat — low-end phone, Data Saver on, or 2G: a plain panorama you swipe sideways

export type Tier = "xr" | "360" | "flat";

type NetworkInfo = { saveData?: boolean; effectiveType?: string };
type XRSystemLike = { isSessionSupported?: (mode: string) => Promise<boolean> };

export type TierInfo = { tier: Tier; canXR: boolean; canWebGL: boolean; reason: string };

export function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl") || c.getContext("experimental-webgl"));
  } catch {
    return false;
  }
}

export async function detectTier(): Promise<TierInfo> {
  const nav = navigator as Navigator & { connection?: NetworkInfo; deviceMemory?: number; xr?: XRSystemLike };
  const canWebGL = hasWebGL();
  let canXR = false;
  try {
    canXR = canWebGL && !!(await nav.xr?.isSessionSupported?.("immersive-vr"));
  } catch {
    canXR = false;
  }

  const conn = nav.connection;
  if (!canWebGL) return { tier: "flat", canXR, canWebGL, reason: "This browser can't show 3D, so you'll get the flat panorama." };
  if (conn?.saveData) return { tier: "flat", canXR, canWebGL, reason: "Data Saver is on, so we'll start with the lighter flat panorama." };
  if (conn?.effectiveType === "2g" || conn?.effectiveType === "slow-2g")
    return { tier: "flat", canXR, canWebGL, reason: "Your connection is slow, so we'll start with the lighter flat panorama." };
  if (typeof nav.deviceMemory === "number" && nav.deviceMemory <= 1)
    return { tier: "flat", canXR, canWebGL, reason: "To keep your phone fast, we'll start with the flat panorama." };
  if (canXR) return { tier: "xr", canXR, canWebGL, reason: "Your device supports VR — you can step inside the tour." };
  return { tier: "360", canXR, canWebGL, reason: "Drag (or tilt your phone) to look all around." };
}
