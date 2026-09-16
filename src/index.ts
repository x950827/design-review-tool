import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "./config.ts";
import { openDb } from "./db.ts";
import { createApp } from "./app.ts";
import { ensureAdminReviewer, listProjects } from "./projects.ts";

const config = loadConfig();
fs.mkdirSync(config.dataDir, { recursive: true });
const db = openDb(path.join(config.dataDir, "app.db"));
for (const project of listProjects(db)) {
  await ensureAdminReviewer(db, project.id, config.adminPassword);
}
const app = createApp(db, config);

const webDist = path.join(path.dirname(fileURLToPath(import.meta.url)), "../web/dist");
if (fs.existsSync(webDist)) {
  app.use("/assets/*", serveStatic({ root: webDist }));
  app.get("/admin", (c) => {
    const html = fs.readFileSync(path.join(webDist, "index.html"), "utf8");
    return c.html(html);
  });
  app.get("/admin/*", (c) => {
    const html = fs.readFileSync(path.join(webDist, "index.html"), "utf8");
    return c.html(html);
  });
  app.get("/p/:slug", (c) => {
    const html = fs.readFileSync(path.join(webDist, "index.html"), "utf8");
    return c.html(html);
  });
  app.get("/", (c) => c.redirect("/admin"));
}

serve({ fetch: app.fetch, hostname: config.host, port: config.port }, (info) => {
  console.log(`design-review-tool http://${info.address}:${info.port}`);
});
