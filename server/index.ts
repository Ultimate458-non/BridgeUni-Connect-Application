import { serve } from "@hono/node-server";
import { app } from "./app.ts";
import { pruneLimits, purgeExpiredSessions } from "./auth.ts";

const PORT = Number(process.env.PORT ?? 8787);

setInterval(() => {
  void purgeExpiredSessions();
  pruneLimits();
}, 60 * 60_000).unref();
void purgeExpiredSessions();

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`BridgeUni API listening on http://localhost:${info.port}`);
});
