import { Glasses, Minus, Plus, RotateCcw, Smartphone } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

/*
 * Lightweight 360° viewer: plain WebGL, one full-screen triangle, and a fragment shader that turns
 * each pixel's view direction into a spot on an equirectangular (2:1) photo. No 3D library, so the
 * whole viewer is a few KB. On WebXR-capable devices it can also render in a VR headset.
 * Draws only when something changes, to save battery on low-end phones.
 */

export type PanoSource = HTMLCanvasElement | string;

/* ---------- 4×4 matrices, column-major like WebGL ---------- */

type M4 = Float32Array;

function perspective(fovy: number, aspect: number, near = 0.1, far = 10): M4 {
  const f = 1 / Math.tan(fovy / 2);
  const nf = 1 / (near - far);
  return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
}

function multiply(a: ArrayLike<number>, b: ArrayLike<number>): M4 {
  const out = new Float32Array(16);
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
      out[c * 4 + r] = s;
    }
  return out;
}

function invert(m: ArrayLike<number>): M4 {
  const [a00, a01, a02, a03, a10, a11, a12, a13, a20, a21, a22, a23, a30, a31, a32, a33] = Array.from(m);
  const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10;
  const b03 = a01 * a12 - a02 * a11, b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12;
  const b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30, b08 = a20 * a33 - a23 * a30;
  const b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
  const det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
  const d = det ? 1 / det : 0;
  return new Float32Array([
    (a11 * b11 - a12 * b10 + a13 * b09) * d, (a02 * b10 - a01 * b11 - a03 * b09) * d,
    (a31 * b05 - a32 * b04 + a33 * b03) * d, (a22 * b04 - a21 * b05 - a23 * b03) * d,
    (a12 * b08 - a10 * b11 - a13 * b07) * d, (a00 * b11 - a02 * b08 + a03 * b07) * d,
    (a32 * b02 - a30 * b05 - a33 * b01) * d, (a20 * b05 - a22 * b02 + a23 * b01) * d,
    (a10 * b10 - a11 * b08 + a13 * b06) * d, (a01 * b08 - a00 * b10 - a03 * b06) * d,
    (a30 * b04 - a31 * b02 + a33 * b00) * d, (a21 * b02 - a20 * b04 - a23 * b00) * d,
    (a11 * b07 - a10 * b09 - a12 * b06) * d, (a00 * b09 - a01 * b07 + a02 * b06) * d,
    (a31 * b01 - a30 * b03 - a32 * b00) * d, (a20 * b03 - a21 * b01 + a22 * b00) * d,
  ]);
}

/** View matrix for a camera turned `yaw` (left +) and tilted `pitch` (up +). */
function viewMatrix(yaw: number, pitch: number): M4 {
  const cy = Math.cos(-yaw), sy = Math.sin(-yaw), cp = Math.cos(-pitch), sp = Math.sin(-pitch);
  const ry = new Float32Array([cy, 0, -sy, 0, 0, 1, 0, 0, sy, 0, cy, 0, 0, 0, 0, 1]);
  const rx = new Float32Array([1, 0, 0, 0, 0, cp, sp, 0, 0, -sp, cp, 0, 0, 0, 0, 1]);
  return multiply(rx, ry);
}

/* ---------- WebGL ---------- */

const VERT = `
attribute vec2 aPos;
varying vec2 vNdc;
void main() { vNdc = aPos; gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 vNdc;
uniform mat4 uInv;
uniform sampler2D uTex;
void main() {
  vec4 p = uInv * vec4(vNdc, 1.0, 1.0);
  vec3 d = normalize(p.xyz / p.w);
  float lon = atan(d.x, -d.z);
  float lat = asin(clamp(d.y, -1.0, 1.0));
  gl_FragColor = texture2D(uTex, vec2(lon / 6.2831853 + 0.5, 0.5 - lat / 3.1415927));
}`;

type GLState = { gl: WebGLRenderingContext; uInv: WebGLUniformLocation; tex: WebGLTexture };

function setupGL(canvas: HTMLCanvasElement): GLState | null {
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false, preserveDrawingBuffer: false });
  if (!gl) return null;
  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader error");
    return s;
  };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? "link error");
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  // Non-power-of-two photos: no mipmaps, clamp edges.
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  return { gl, uInv: gl.getUniformLocation(prog, "uInv")!, tex };
}

/* ---------- Minimal WebXR typings (not in TypeScript's DOM lib) ---------- */

type XRViewLike = { projectionMatrix: Float32Array; transform: { inverse: { matrix: Float32Array } } };
type XRLayerLike = { framebuffer: WebGLFramebuffer | null; getViewport: (v: XRViewLike) => { x: number; y: number; width: number; height: number } };
type XRFrameLike = { getViewerPose: (ref: unknown) => { views: XRViewLike[] } | null };
type XRSessionLike = {
  requestAnimationFrame: (cb: (t: number, f: XRFrameLike) => void) => number;
  requestReferenceSpace: (type: string) => Promise<unknown>;
  updateRenderState: (s: { baseLayer: unknown }) => void;
  renderState: { baseLayer: XRLayerLike };
  addEventListener: (e: "end", cb: () => void) => void;
  end: () => Promise<void>;
};

/* ---------- Component ---------- */

const FOV_MIN = 35, FOV_MAX = 100, PITCH_MAX = (85 * Math.PI) / 180;

export default function PanoViewer({
  source,
  title,
  canXR,
  onFail,
}: {
  source: PanoSource;
  title: string;
  canXR: boolean;
  /** Called if this device can't draw the 360° view (so the page can switch to flat). */
  onFail: (reason: string) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<GLState | null>(null);
  const view = useRef({ yaw: 0, pitch: 0, fov: (75 * Math.PI) / 180 });
  const frame = useRef<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [gyro, setGyro] = useState(false);
  const [inXR, setInXR] = useState(false);
  const xrSession = useRef<XRSessionLike | null>(null);

  const draw = useCallback(() => {
    frame.current = null;
    const s = glRef.current;
    const canvas = canvasRef.current;
    if (!s || !canvas || xrSession.current) return;
    const { gl } = s;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    const { yaw, pitch, fov } = view.current;
    const vp = multiply(perspective(fov, canvas.width / Math.max(1, canvas.height)), viewMatrix(yaw, pitch));
    gl.uniformMatrix4fv(s.uInv, false, invert(vp));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }, []);

  const requestDraw = useCallback(() => {
    if (frame.current == null) frame.current = requestAnimationFrame(draw);
  }, [draw]);

  const clampView = () => {
    const v = view.current;
    v.pitch = Math.max(-PITCH_MAX, Math.min(PITCH_MAX, v.pitch));
    v.fov = Math.max((FOV_MIN * Math.PI) / 180, Math.min((FOV_MAX * Math.PI) / 180, v.fov));
  };

  // Set up WebGL + load the photo
  useEffect(() => {
    const canvas = canvasRef.current!;
    let state: GLState | null = null;
    try {
      state = setupGL(canvas);
    } catch {
      state = null;
    }
    if (!state) {
      onFail("This device couldn't start the 360° view.");
      return;
    }
    glRef.current = state;
    const upload = (img: TexImageSource) => {
      const { gl, tex } = state!;
      const max = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
      const w = (img as HTMLImageElement).naturalWidth || (img as HTMLCanvasElement).width;
      if (w > max) {
        onFail("This photo is too big for this phone's graphics — showing the flat version.");
        return;
      }
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
      setLoading(false);
      requestDraw();
    };
    let cancelled = false;
    if (typeof source === "string") {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => !cancelled && upload(img);
      img.onerror = () => !cancelled && onFail("The tour photo didn't load. Check your connection.");
      img.src = source;
    } else upload(source);

    const lose = (e: Event) => {
      e.preventDefault();
      onFail("The 360° view stopped (the phone ran low on graphics memory).");
    };
    canvas.addEventListener("webglcontextlost", lose);
    return () => {
      cancelled = true;
      canvas.removeEventListener("webglcontextlost", lose);
      if (frame.current != null) cancelAnimationFrame(frame.current);
      frame.current = null; // or requestDraw() would think a frame is still pending and never draw again
      void xrSession.current?.end().catch(() => {});
      // Don't force-lose the context here: React may re-run this effect on the same canvas
      // (Strict Mode, remounts). The browser frees it when the canvas is removed.
      glRef.current = null;
    };
  }, [source, onFail, requestDraw]);

  // Keep the canvas sharp but cheap: cap pixel ratio at 2.
  useEffect(() => {
    const wrap = wrapRef.current!;
    const canvas = canvasRef.current!;
    const ro = new ResizeObserver(() => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(wrap.clientWidth * dpr);
      canvas.height = Math.round(wrap.clientHeight * dpr);
      requestDraw();
    });
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [requestDraw]);

  // Drag / pinch / wheel
  useEffect(() => {
    const canvas = canvasRef.current!;
    const pointers = new Map<number, { x: number; y: number }>();
    let pinch = 0;
    const onDown = (e: PointerEvent) => {
      canvas.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    };
    const onMove = (e: PointerEvent) => {
      const prev = pointers.get(e.pointerId);
      if (!prev) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const v = view.current;
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch) v.fov *= pinch / dist;
        pinch = dist;
      } else {
        const k = v.fov / canvas.clientHeight;
        v.yaw += (e.clientX - prev.x) * k;
        v.pitch += (e.clientY - prev.y) * k;
      }
      clampView();
      requestDraw();
    };
    const onUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = 0;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      view.current.fov *= Math.exp(e.deltaY * 0.001);
      clampView();
      requestDraw();
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("wheel", onWheel);
    };
  }, [requestDraw]);

  // Tilt-to-look (phone gyroscope), only when switched on
  useEffect(() => {
    if (!gyro) return;
    let base: number | null = null;
    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.alpha == null || e.beta == null) return;
      base ??= e.alpha;
      view.current.yaw = ((e.alpha - base) * Math.PI) / 180;
      view.current.pitch = ((e.beta - 90) * Math.PI) / 180;
      clampView();
      requestDraw();
    };
    window.addEventListener("deviceorientation", onOrient);
    return () => window.removeEventListener("deviceorientation", onOrient);
  }, [gyro, requestDraw]);

  const toggleGyro = async () => {
    if (gyro) return setGyro(false);
    const D = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
    if (typeof D.requestPermission === "function") {
      try {
        if ((await D.requestPermission()) !== "granted") return;
      } catch {
        return;
      }
    }
    setGyro(true);
  };

  const onKey = (e: React.KeyboardEvent) => {
    const v = view.current;
    const step = 0.12;
    const map: Record<string, () => void> = {
      ArrowLeft: () => (v.yaw += step),
      ArrowRight: () => (v.yaw -= step),
      ArrowUp: () => (v.pitch += step),
      ArrowDown: () => (v.pitch -= step),
      "+": () => (v.fov *= 0.9),
      "=": () => (v.fov *= 0.9),
      "-": () => (v.fov *= 1.1),
    };
    if (!map[e.key]) return;
    e.preventDefault();
    map[e.key]();
    clampView();
    requestDraw();
  };

  const zoom = (f: number) => {
    view.current.fov *= f;
    clampView();
    requestDraw();
  };

  const enterVR = async () => {
    const s = glRef.current;
    const xr = (navigator as Navigator & { xr?: { requestSession: (m: string) => Promise<XRSessionLike> } }).xr;
    const Layer = (window as unknown as { XRWebGLLayer?: new (s: XRSessionLike, gl: WebGLRenderingContext) => XRLayerLike }).XRWebGLLayer;
    if (!s || !xr || !Layer) return;
    try {
      const session = await xr.requestSession("immersive-vr");
      await (s.gl as WebGLRenderingContext & { makeXRCompatible?: () => Promise<void> }).makeXRCompatible?.();
      session.updateRenderState({ baseLayer: new Layer(session, s.gl) });
      const ref = await session.requestReferenceSpace("local");
      xrSession.current = session;
      setInXR(true);
      const onFrame = (_t: number, xf: XRFrameLike) => {
        if (!xrSession.current) return;
        session.requestAnimationFrame(onFrame);
        const pose = xf.getViewerPose(ref);
        if (!pose) return;
        const layer = session.renderState.baseLayer;
        s.gl.bindFramebuffer(s.gl.FRAMEBUFFER, layer.framebuffer);
        for (const v of pose.views) {
          const vp = layer.getViewport(v);
          s.gl.viewport(vp.x, vp.y, vp.width, vp.height);
          const rot = new Float32Array(v.transform.inverse.matrix);
          rot[12] = rot[13] = rot[14] = 0; // look around only; the photo stays around you
          s.gl.uniformMatrix4fv(s.uInv, false, invert(multiply(v.projectionMatrix, rot)));
          s.gl.drawArrays(s.gl.TRIANGLES, 0, 3);
        }
      };
      session.requestAnimationFrame(onFrame);
      session.addEventListener("end", () => {
        xrSession.current = null;
        setInXR(false);
        requestDraw();
      });
    } catch {
      /* user cancelled or headset unavailable */
    }
  };

  const hasGyro = typeof window !== "undefined" && "DeviceOrientationEvent" in window && navigator.maxTouchPoints > 0;
  const btn = "flex size-10 items-center justify-center rounded-full bg-card/90 text-foreground shadow-card hover:bg-card";

  return (
    <div ref={wrapRef} className="relative h-[60vh] max-h-140 min-h-75 w-full overflow-hidden rounded-xl bg-primary-deep">
      <canvas
        ref={canvasRef}
        tabIndex={0}
        role="img"
        aria-label={`${title}. 360 degree view. Drag or use arrow keys to look around, plus and minus to zoom.`}
        onKeyDown={onKey}
        className="block size-full cursor-grab touch-none active:cursor-grabbing"
      />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-primary-foreground">
          Loading 360° view…
        </div>
      )}
      {inXR && (
        <div className="absolute inset-0 flex items-center justify-center bg-primary-deep/80 text-center text-sm font-semibold text-primary-foreground">
          Look through your headset. Take it off or press its menu button to leave VR.
        </div>
      )}
      <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-primary-deep/70 px-3 py-1 text-xs font-semibold text-primary-foreground">
        Drag to look around
      </div>
      <div className="absolute bottom-3 right-3 flex gap-2">
        <button type="button" className={btn} onClick={() => zoom(0.85)} aria-label="Zoom in"><Plus className="size-5" /></button>
        <button type="button" className={btn} onClick={() => zoom(1.15)} aria-label="Zoom out"><Minus className="size-5" /></button>
        <button type="button" className={btn} aria-label="Reset view"
          onClick={() => { view.current = { yaw: 0, pitch: 0, fov: (75 * Math.PI) / 180 }; requestDraw(); }}>
          <RotateCcw className="size-5" />
        </button>
        {hasGyro && (
          <button type="button" className={`${btn} ${gyro ? "bg-primary! text-primary-foreground!" : ""}`} onClick={toggleGyro}
            aria-pressed={gyro} aria-label="Tilt your phone to look around">
            <Smartphone className="size-5" />
          </button>
        )}
      </div>
      {canXR && !inXR && (
        <button type="button" onClick={enterVR} className="btn-solid absolute bottom-3 left-3 min-h-10 py-2 text-sm">
          <Glasses className="size-4" aria-hidden /> Enter VR
        </button>
      )}
    </div>
  );
}
