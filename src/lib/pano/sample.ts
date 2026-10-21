// A 360° SAMPLE scene drawn on the device (no download). It is an illustration used until real
// campus photos are added, and says so in large letters all the way round.

let cached: HTMLCanvasElement | null = null;

export function sampleScene(): HTMLCanvasElement {
  if (cached) return cached;
  const W = 2048;
  const H = 1024;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  const horizon = H * 0.55;

  // Sky
  const sky = g.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, "#2a5bd7");
  sky.addColorStop(1, "#bcd4ff");
  g.fillStyle = sky;
  g.fillRect(0, 0, W, horizon);

  // Ground: lawn + paved path
  const ground = g.createLinearGradient(0, horizon, 0, H);
  ground.addColorStop(0, "#7fae5b");
  ground.addColorStop(1, "#4d7a35");
  g.fillStyle = ground;
  g.fillRect(0, horizon, W, H - horizon);
  g.fillStyle = "#d9cfbf";
  g.fillRect(0, horizon + 40, W, 70);

  // Simple, generic building blocks around the horizon (not any real campus)
  const blocks = [
    { x: 60, w: 260, h: 170 }, { x: 380, w: 180, h: 240 }, { x: 640, w: 320, h: 150 },
    { x: 1040, w: 220, h: 210 }, { x: 1330, w: 300, h: 170 }, { x: 1700, w: 250, h: 230 },
  ];
  for (const b of blocks) {
    g.fillStyle = "#e8e2d6";
    g.fillRect(b.x, horizon - b.h, b.w, b.h);
    g.fillStyle = "#9aa6b8";
    for (let y = horizon - b.h + 20; y < horizon - 30; y += 36)
      for (let x = b.x + 16; x < b.x + b.w - 24; x += 40) g.fillRect(x, y, 22, 20);
    g.fillStyle = "#6b7280";
    g.fillRect(b.x + b.w / 2 - 18, horizon - 50, 36, 50);
  }

  // Trees
  for (let x = 30; x < W; x += 170) {
    g.fillStyle = "#5b3a1e";
    g.fillRect(x + 10, horizon - 30, 8, 40);
    g.fillStyle = "#3f7d34";
    g.beginPath();
    g.arc(x + 14, horizon - 40, 26, 0, Math.PI * 2);
    g.fill();
  }

  // Compass labels so people can orient themselves
  g.font = "bold 44px Arial, sans-serif";
  g.textAlign = "center";
  g.fillStyle = "rgba(255,255,255,0.9)";
  // The viewer starts facing the middle of the image (u = 0.5), so that is "N".
  const compass: [string, number][] = [["N", 0.5], ["E", 0.75], ["S", 0], ["S", 1], ["W", 0.25]];
  for (const [label, u] of compass) g.fillText(label, u * W, 70);

  // Big honest label, repeated all the way round
  g.font = "bold 40px Arial, sans-serif";
  for (let i = 0; i < 4; i++) {
    const x = (W / 4) * i + W / 8;
    g.fillStyle = "rgba(15,23,42,0.72)";
    g.fillRect(x - 230, horizon + 150, 460, 120);
    g.fillStyle = "#ffffff";
    g.fillText("SAMPLE SCENE", x, horizon + 200);
    g.font = "bold 24px Arial, sans-serif";
    g.fillText("Not a photo of a real campus", x, horizon + 245);
    g.font = "bold 40px Arial, sans-serif";
  }

  cached = c;
  return c;
}
