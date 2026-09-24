import { test, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { openDb } from "../src/db.ts";
import { createApp } from "../src/app.ts";
import type { Config } from "../src/config.ts";
import { createReviewer } from "../src/auth.ts";
import { createProject } from "../src/projects.ts";
import { syncProject } from "../src/git.ts";

function git(cwd: string, args: string[]) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
}

function makeRepo(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dr-app-repo-"));
  git(dir, ["init", "-b", "main"]);
  git(dir, ["config", "user.email", "test@example.com"]);
  git(dir, ["config", "user.name", "Test"]);
  fs.mkdirSync(path.join(dir, "variant-a", "assets"), { recursive: true });
  fs.writeFileSync(
    path.join(dir, "variant-a", "index.html"),
    "<html><body><h1>Hero</h1></body></html>",
  );
  fs.writeFileSync(path.join(dir, "variant-a", "assets", "pixel.png"), "png");
  git(dir, ["add", "."]);
  git(dir, ["commit", "-m", "first"]);
  return dir;
}

function setup() {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "dr-app-data-"));
  const db = openDb(path.join(dataDir, "app.db"));
  const config: Config = {
    host: "127.0.0.1",
    port: 0,
    adminPassword: "admin-secret",
    sessionSecret: "0123456789abcdef",
    dataDir,
    cookieSecure: false,
    trustProxy: false,
  };
  const app = createApp(db, config);
  return { db, config, app, dataDir };
}

function cookie(res: Response, name: string): string {
  const raw = res.headers.get("set-cookie") ?? "";
  const match = raw.split(/,(?=\s*[^;]+=)/).find((part) => part.trim().startsWith(`${name}=`));
  if (!match) throw new Error(`missing cookie ${name} in ${raw}`);
  return match.split(";", 1)[0]!;
}

test("health endpoint is public", async () => {
  const { app } = setup();
  const res = await app.request("/health");
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ ok: true });
});

test("reviewer cannot use admin routes; comments are shared after named login", async () => {
  const { db, app, config } = setup();
  const repo = makeRepo();
  const project = createProject(db, {
    slug: "shop",
    title: "Shop",
    gitUrl: repo,
    branch: "main",
    variants: [{ key: "a", label: "A", git_path: "variant-a" }],
  });
  await createReviewer(db, project.id, "Анна", "anna-pass");
  await createReviewer(db, project.id, "Иван", "ivan-pass");
  await syncProject(config.dataDir, {
    id: project.id,
    git_url: project.git_url,
    branch: project.branch,
    ssh_key_path: project.ssh_key_path,
  });

  const denied = await app.request("/admin/api/projects");
  expect(denied.status).toBe(401);

  const adminLogin = await app.request("/admin/api/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password: "admin-secret" }),
  });
  expect(adminLogin.status).toBe(200);
  const adminCookie = cookie(adminLogin, "dr_admin");
  const listed = await app.request("/admin/api/projects", {
    headers: { cookie: adminCookie },
  });
  expect(listed.status).toBe(200);

  const annaLogin = await app.request("/p/shop/api/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Анна", password: "anna-pass" }),
  });
  expect(annaLogin.status).toBe(200);
  const annaCookie = cookie(annaLogin, "dr_rev_shop");

  const created = await app.request("/p/shop/api/comments", {
    method: "POST",
    headers: { "content-type": "application/json", cookie: annaCookie },
    body: JSON.stringify({
      variantKey: "a",
      commitSha: "abc1234",
      viewport: 390,
      kind: "element",
      selector: "h1",
      body: "hero is quiet",
    }),
  });
  expect(created.status).toBe(201);

  const ivanLogin = await app.request("/p/shop/api/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Иван", password: "ivan-pass" }),
  });
  const ivanCookie = cookie(ivanLogin, "dr_rev_shop");
  const list = await app.request("/p/shop/api/comments?variant=a", {
    headers: { cookie: ivanCookie },
  });
  expect(list.status).toBe(200);
  const payload = (await list.json()) as { comments: { body: string }[] };
  expect(payload.comments[0]?.body).toBe("hero is quiet");

  const history = await app.request("/p/shop/api/history", {
    headers: { cookie: annaCookie },
  });
  const hist = (await history.json()) as { history: { sha: string }[] };
  expect(hist.history.length).toBeGreaterThanOrEqual(1);
  const sha = hist.history[0]!.sha;
  const html = await app.request(`/p/shop/files/${sha}/a/index.html`, {
    headers: { cookie: annaCookie },
  });
  expect(html.status).toBe(200);
  const htmlText = await html.text();
  expect(htmlText).toContain("Hero");
  expect(htmlText).toContain("/p/shop/bridge.js");

  const bridge = await app.request("/p/shop/bridge.js", {
    headers: { cookie: annaCookie },
  });
  expect(bridge.status).toBe(200);
  const bridgeText = await bridge.text();
  expect(bridgeText).toContain('closest("[data-review-id], [data-od-id]")');
  expect(bridgeText).toContain("data-od-id");

  const asset = await app.request(`/p/shop/files/${sha}/a/assets/pixel.png`, {
    headers: { cookie: annaCookie },
  });
  expect(asset.status).toBe(200);

  const traversal = await app.request(`/p/shop/files/${sha}/a/../${"../".repeat(8)}etc/passwd`, {
    headers: { cookie: annaCookie },
  });
  expect([400, 401, 404]).toContain(traversal.status);

  const exported = await app.request(`/admin/api/projects/${project.id}/export.json`, {
    headers: { cookie: adminCookie },
  });
  expect(exported.status).toBe(200);
  const dump = (await exported.json()) as { comments: unknown[] };
  expect(dump.comments).toHaveLength(1);
});

test("creating a project via admin API also creates admin with the admin password", async () => {
  const { app } = setup();
  const adminLogin = await app.request("/admin/api/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password: "admin-secret" }),
  });
  expect(adminLogin.status).toBe(200);
  const adminCookie = cookie(adminLogin, "dr_admin");
  const created = await app.request("/admin/api/projects", {
    method: "POST",
    headers: { "content-type": "application/json", cookie: adminCookie },
    body: JSON.stringify({
      slug: "shop",
      title: "Shop",
      gitUrl: "/tmp/x",
      branch: "main",
      variants: [{ key: "a", label: "A", git_path: "variant-a" }],
    }),
  });
  expect(created.status).toBe(201);
  const listed = await app.request("/admin/api/projects", {
    headers: { cookie: adminCookie },
  });
  const payload = (await listed.json()) as {
    projects: { reviewers: { name: string }[] }[];
  };
  expect(payload.projects[0]?.reviewers.map((r) => r.name)).toContain("admin");
  const login = await app.request("/p/shop/api/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "admin", password: "admin-secret" }),
  });
  expect(login.status).toBe(200);
  expect(((await login.json()) as { name: string }).name).toBe("admin");
});

test("wrong reviewer password is 401; other project is isolated", async () => {
  const { db, app } = setup();
  const project = createProject(db, {
    slug: "shop",
    title: "Shop",
    gitUrl: "/tmp/x",
    branch: "main",
    variants: [{ key: "a", label: "A", git_path: "variant-a" }],
  });
  createProject(db, {
    slug: "other",
    title: "Other",
    gitUrl: "/tmp/y",
    branch: "main",
    variants: [{ key: "a", label: "A", git_path: "variant-a" }],
  });
  await createReviewer(db, project.id, "Анна", "anna-pass");
  const bad = await app.request("/p/shop/api/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Анна", password: "nope" }),
  });
  expect(bad.status).toBe(401);
  const other = await app.request("/p/other/api/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Анна", password: "anna-pass" }),
  });
  expect(other.status).toBe(401);
});

function setCookieFlags(res: Response, name: string): string {
  const cookies =
    typeof res.headers.getSetCookie === "function"
      ? res.headers.getSetCookie()
      : (res.headers.get("set-cookie") ?? "").split(/,(?=\s*[^;]+=)/);
  const match = cookies.find((part) => part.trim().startsWith(`${name}=`));
  if (!match) throw new Error(`missing cookie ${name}`);
  return match;
}

test("admin and reviewer cookies stay HttpOnly Lax and follow COOKIE_SECURE", async () => {
  const insecure = setup();
  const adminLogin = await insecure.app.request("/admin/api/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password: "admin-secret" }),
  });
  const adminCookie = setCookieFlags(adminLogin, "dr_admin");
  expect(adminCookie).toMatch(/HttpOnly/i);
  expect(adminCookie).toMatch(/SameSite=Lax/i);
  expect(adminCookie).toMatch(/Path=\/admin/i);
  expect(adminCookie).not.toMatch(/Secure/i);

  const project = createProject(insecure.db, {
    slug: "shop",
    title: "Shop",
    gitUrl: "/tmp/x",
    branch: "main",
    variants: [{ key: "a", label: "A", git_path: "variant-a" }],
  });
  await createReviewer(insecure.db, project.id, "Анна", "anna-pass");
  const reviewerLogin = await insecure.app.request("/p/shop/api/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Анна", password: "anna-pass" }),
  });
  const reviewerCookie = setCookieFlags(reviewerLogin, "dr_rev_shop");
  expect(reviewerCookie).toMatch(/HttpOnly/i);
  expect(reviewerCookie).toMatch(/SameSite=Lax/i);
  expect(reviewerCookie).toMatch(/Path=\/p\/shop/i);
  expect(reviewerCookie).not.toMatch(/Secure/i);

  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "dr-app-data-"));
  const db = openDb(path.join(dataDir, "app.db"));
  const app = createApp(db, {
    host: "127.0.0.1",
    port: 0,
    adminPassword: "admin-secret",
    sessionSecret: "0123456789abcdef",
    dataDir,
    cookieSecure: true,
    trustProxy: false,
  });
  const projectB = createProject(db, {
    slug: "shop",
    title: "Shop",
    gitUrl: "/tmp/x",
    branch: "main",
    variants: [{ key: "a", label: "A", git_path: "variant-a" }],
  });
  await createReviewer(db, projectB.id, "Анна", "anna-pass");
  const secureAdmin = await app.request("/admin/api/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password: "admin-secret" }),
  });
  const secureReviewer = await app.request("/p/shop/api/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Анна", password: "anna-pass" }),
  });
  expect(setCookieFlags(secureAdmin, "dr_admin")).toMatch(/Secure/i);
  expect(setCookieFlags(secureReviewer, "dr_rev_shop")).toMatch(/Secure/i);
});

test("opening a project clears the admin session cookie", async () => {
  const { db, app } = setup();
  createProject(db, {
    slug: "shop",
    title: "Shop",
    gitUrl: "/tmp/x",
    branch: "main",
    variants: [{ key: "a", label: "A", git_path: "variant-a" }],
  });
  const adminLogin = await app.request("/admin/api/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password: "admin-secret" }),
  });
  const adminCookie = cookie(adminLogin, "dr_admin");
  const project = await app.request("/p/shop/api/session", {
    headers: { cookie: adminCookie },
  });
  const cleared = setCookieFlags(project, "dr_admin");
  expect(cleared).toMatch(/Path=\/admin/i);
  expect(cleared).toMatch(/Max-Age=0|Expires=/i);
});
