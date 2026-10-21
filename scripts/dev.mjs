// Runs the API server and the Vite dev server together. Ctrl+C stops both.
import { spawn } from "node:child_process";

const procs = [
  ["api", "npx tsx watch --clear-screen=false server/index.ts"],
  ["web", "npx vite"],
].map(([name, cmd]) => {
  const p = spawn(cmd, { shell: true, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, NODE_NO_WARNINGS: "1" } });
  const tag = name === "api" ? "\x1b[36m[api]\x1b[0m " : "\x1b[33m[web]\x1b[0m ";
  const out = (s) => (d) => s.write(d.toString().replace(/^(?=.)/gm, tag));
  p.stdout.on("data", out(process.stdout));
  p.stderr.on("data", out(process.stderr));
  p.on("exit", (code) => {
    console.log(`${tag}exited (${code}) — stopping`);
    procs.forEach((q) => q !== p && q.kill());
    process.exit(code ?? 0);
  });
  return p;
});
process.on("SIGINT", () => procs.forEach((p) => p.kill()));
