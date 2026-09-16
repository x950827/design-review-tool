import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { Context } from "hono";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type Database from "better-sqlite3";
import type { Config } from "./config.ts";
import {
  ADMIN_COOKIE,
  LoginLimiter,
  createReviewer,
  loginAdmin,
  loginReviewer,
  readSession,
  resetReviewerPassword,
  reviewerCookieName,
  setReviewerDisabled,
  signSession,
  type ReviewerSession,
} from "./auth.ts";
import {
  addReply,
  createComment,
  exportProject,
  getComment,
  listOpenComments,
  listReplies,
  setCommentStatus,
  type CommentKind,
} from "./comments.ts";
import { checkoutSha, history, loadVariants, syncProject } from "./git.ts";
import { injectBridge, mimeType, resolvePreviewFile } from "./preview.ts";
import {
  createProject,
  getProjectById,
  getProjectBySlug,
  listProjects,
  listReviewers,
} from "./projects.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const bridgeSource = fs.readFileSync(path.join(here, "bridge.js"), "utf8");

function cookieOpts(pathValue: string) {
  return {
    path: pathValue,
    httpOnly: true,
    sameSite: "Lax" as const,
    secure: false,
  };
}

function adminOk(c: Context, config: Config): boolean {
  const session = readSession(getCookie(c, ADMIN_COOKIE), config.sessionSecret);
  return session?.kind === "admin";
}

function reviewerOk(c: Context, config: Config, slug: string): ReviewerSession | null {
  const session = readSession(getCookie(c, reviewerCookieName(slug)), config.sessionSecret);
  if (!session || session.kind !== "reviewer" || session.slug !== slug) return null;
  return session;
}

function clientKey(c: Context, extra: string): string {
  return `${c.req.header("x-forwarded-for") ?? "ip"}:${extra}`;
}

export function createApp(db: Database.Database, config: Config): Hono {
  const app = new Hono();
  const limiter = new LoginLimiter();

  app.get("/health", (c) => c.json({ ok: true }));

  app.post("/admin/api/login", async (c) => {
    if (!limiter.allow(clientKey(c, "admin"))) {
      return c.json({ error: "too many attempts" }, 429);
    }
    const body = await c.req.json<{ password?: string }>().catch(() => ({}));
    const session = await loginAdmin(body.password ?? "", config.adminPassword);
    if (!session) return c.json({ error: "invalid credentials" }, 401);
    setCookie(c, ADMIN_COOKIE, signSession(session, config.sessionSecret), {
      ...cookieOpts("/admin"),
      maxAge: 14 * 24 * 60 * 60,
    });
    return c.json({ ok: true });
  });

  app.post("/admin/api/logout", (c) => {
    deleteCookie(c, ADMIN_COOKIE, { path: "/admin" });
    return c.json({ ok: true });
  });

  app.get("/admin/api/session", (c) => {
    if (!adminOk(c, config)) return c.json({ error: "unauthorized" }, 401);
    return c.json({ ok: true });
  });

  app.get("/admin/api/projects", (c) => {
    if (!adminOk(c, config)) return c.json({ error: "unauthorized" }, 401);
    const projects = listProjects(db).map((p) => ({
      ...p,
      variants: loadVariants(db, p.id),
      reviewers: listReviewers(db, p.id),
    }));
    return c.json({ projects });
  });

  app.post("/admin/api/projects", async (c) => {
    if (!adminOk(c, config)) return c.json({ error: "unauthorized" }, 401);
    const body = await c.req.json<{
      slug: string;
      title: string;
      gitUrl: string;
      branch?: string;
      sshKeyPath?: string;
      variants: { key: string; label: string; git_path: string }[];
    }>();
    try {
      const project = createProject(db, {
        slug: body.slug,
        title: body.title,
        gitUrl: body.gitUrl,
        branch: body.branch ?? "main",
        sshKeyPath: body.sshKeyPath ?? config.sshKeyPath ?? null,
        variants: body.variants,
      });
      return c.json({ project }, 201);
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : "failed" }, 400);
    }
  });

  app.post("/admin/api/projects/:id/reviewers", async (c) => {
    if (!adminOk(c, config)) return c.json({ error: "unauthorized" }, 401);
    const project = getProjectById(db, Number(c.req.param("id")));
    if (!project) return c.json({ error: "not found" }, 404);
    const body = await c.req.json<{ name: string; password: string }>();
    try {
      const reviewer = await createReviewer(db, project.id, body.name, body.password);
      return c.json({ reviewer }, 201);
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : "failed" }, 400);
    }
  });

  app.post("/admin/api/projects/:id/reviewers/:rid/disable", async (c) => {
    if (!adminOk(c, config)) return c.json({ error: "unauthorized" }, 401);
    setReviewerDisabled(db, Number(c.req.param("rid")), true);
    return c.json({ ok: true });
  });

  app.post("/admin/api/projects/:id/reviewers/:rid/reset", async (c) => {
    if (!adminOk(c, config)) return c.json({ error: "unauthorized" }, 401);
    const body = await c.req.json<{ password: string }>();
    await resetReviewerPassword(db, Number(c.req.param("rid")), body.password);
    return c.json({ ok: true });
  });

  app.post("/admin/api/projects/:id/sync", async (c) => {
    if (!adminOk(c, config)) return c.json({ error: "unauthorized" }, 401);
    const project = getProjectById(db, Number(c.req.param("id")));
    if (!project) return c.json({ error: "not found" }, 404);
    try {
      await syncProject(config.dataDir, {
        id: project.id,
        git_url: project.git_url,
        branch: project.branch,
        ssh_key_path: project.ssh_key_path,
      });
      const entries = await history(
        config.dataDir,
        {
          id: project.id,
          git_url: project.git_url,
          branch: project.branch,
          ssh_key_path: project.ssh_key_path,
        },
        loadVariants(db, project.id),
      );
      return c.json({ ok: true, history: entries });
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : "sync failed" }, 400);
    }
  });

  app.get("/admin/api/projects/:id/export.json", (c) => {
    if (!adminOk(c, config)) return c.json({ error: "unauthorized" }, 401);
    const project = getProjectById(db, Number(c.req.param("id")));
    if (!project) return c.json({ error: "not found" }, 404);
    return c.json(exportProject(db, project.id));
  });

  app.post("/p/:slug/api/login", async (c) => {
    const slug = c.req.param("slug");
    if (!limiter.allow(clientKey(c, slug))) {
      return c.json({ error: "too many attempts" }, 429);
    }
    const body = await c.req.json<{ name?: string; password?: string }>().catch(() => ({}));
    const session = await loginReviewer(db, slug, body.name ?? "", body.password ?? "");
    if (!session) return c.json({ error: "invalid credentials" }, 401);
    setCookie(c, reviewerCookieName(slug), signSession(session, config.sessionSecret), {
      ...cookieOpts(`/p/${slug}`),
      maxAge: 14 * 24 * 60 * 60,
    });
    return c.json({ ok: true, name: session.name });
  });

  app.post("/p/:slug/api/logout", (c) => {
    const slug = c.req.param("slug");
    deleteCookie(c, reviewerCookieName(slug), { path: `/p/${slug}` });
    return c.json({ ok: true });
  });

  app.get("/p/:slug/api/session", (c) => {
    const slug = c.req.param("slug");
    const session = reviewerOk(c, config, slug);
    if (!session) return c.json({ error: "unauthorized" }, 401);
    const project = getProjectBySlug(db, slug);
    if (!project) return c.json({ error: "not found" }, 404);
    return c.json({
      name: session.name,
      project: {
        slug: project.slug,
        title: project.title,
        variants: loadVariants(db, project.id),
      },
    });
  });

  app.get("/p/:slug/api/history", async (c) => {
    const slug = c.req.param("slug");
    const session = reviewerOk(c, config, slug);
    if (!session) return c.json({ error: "unauthorized" }, 401);
    const project = getProjectBySlug(db, slug);
    if (!project) return c.json({ error: "not found" }, 404);
    try {
      const entries = await history(
        config.dataDir,
        {
          id: project.id,
          git_url: project.git_url,
          branch: project.branch,
          ssh_key_path: project.ssh_key_path,
        },
        loadVariants(db, project.id),
      );
      return c.json({ history: entries });
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : "history failed" }, 400);
    }
  });

  app.get("/p/:slug/api/comments", (c) => {
    const slug = c.req.param("slug");
    const session = reviewerOk(c, config, slug);
    if (!session) return c.json({ error: "unauthorized" }, 401);
    const variant = c.req.query("variant");
    if (!variant) return c.json({ error: "variant required" }, 400);
    const comments = listOpenComments(db, session.projectId, variant);
    const replies = listReplies(
      db,
      comments.map((row) => row.id),
    );
    return c.json({ comments, replies });
  });

  app.post("/p/:slug/api/comments", async (c) => {
    const slug = c.req.param("slug");
    const session = reviewerOk(c, config, slug);
    if (!session) return c.json({ error: "unauthorized" }, 401);
    const body = await c.req.json<{
      variantKey: string;
      commitSha: string;
      viewport: number;
      kind: CommentKind;
      selector?: string;
      reviewId?: string;
      rect?: { x: number; y: number; w: number; h: number };
      body: string;
    }>();
    try {
      const comment = createComment(db, {
        projectId: session.projectId,
        reviewerId: session.reviewerId,
        variantKey: body.variantKey,
        commitSha: body.commitSha,
        viewport: body.viewport,
        kind: body.kind,
        selector: body.selector,
        reviewId: body.reviewId,
        rect: body.rect,
        body: body.body,
      });
      return c.json({ comment }, 201);
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : "failed" }, 400);
    }
  });

  app.post("/p/:slug/api/comments/:id/replies", async (c) => {
    const slug = c.req.param("slug");
    const session = reviewerOk(c, config, slug);
    if (!session) return c.json({ error: "unauthorized" }, 401);
    const comment = getComment(db, Number(c.req.param("id")));
    if (!comment || comment.project_id !== session.projectId) {
      return c.json({ error: "not found" }, 404);
    }
    const body = await c.req.json<{ body: string }>();
    try {
      const reply = addReply(db, comment.id, session.reviewerId, body.body);
      return c.json({ reply }, 201);
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : "failed" }, 400);
    }
  });

  app.post("/p/:slug/api/comments/:id/status", async (c) => {
    const slug = c.req.param("slug");
    const session = reviewerOk(c, config, slug);
    if (!session) return c.json({ error: "unauthorized" }, 401);
    const comment = getComment(db, Number(c.req.param("id")));
    if (!comment || comment.project_id !== session.projectId) {
      return c.json({ error: "not found" }, 404);
    }
    const body = await c.req.json<{ status: "open" | "resolved" }>();
    const updated = setCommentStatus(db, comment.id, body.status);
    return c.json({ comment: updated });
  });

  app.get("/p/:slug/bridge.js", (c) => {
    const slug = c.req.param("slug");
    if (!reviewerOk(c, config, slug)) return c.body("unauthorized", 401);
    return c.body(bridgeSource, 200, {
      "content-type": "text/javascript; charset=utf-8",
    });
  });

  app.get("/p/:slug/files/:sha/:variantKey/*", async (c) => {
    const slug = c.req.param("slug");
    const session = reviewerOk(c, config, slug);
    if (!session) return c.body("unauthorized", 401);
    const project = getProjectBySlug(db, slug);
    if (!project) return c.body("not found", 404);
    const variant = loadVariants(db, project.id).find((v) => v.key === c.req.param("variantKey"));
    if (!variant) return c.body("not found", 404);
    let root: string;
    try {
      const checkout = await checkoutSha(
        config.dataDir,
        {
          id: project.id,
          git_url: project.git_url,
          branch: project.branch,
          ssh_key_path: project.ssh_key_path,
        },
        c.req.param("sha"),
      );
      root = path.join(checkout, variant.git_path);
    } catch (err) {
      return c.body(err instanceof Error ? err.message : "checkout failed", 400);
    }
    const rest = c.req.path.replace(`/p/${slug}/files/${c.req.param("sha")}/${c.req.param("variantKey")}`, "");
    const file = resolvePreviewFile(root, rest);
    if (!file) return c.body("not found", 404);
    if (file.endsWith(".html") || file.endsWith(".htm")) {
      const html = injectBridge(
        fs.readFileSync(file, "utf8"),
        `/p/${slug}/bridge.js`,
      );
      return c.body(html, 200, { "content-type": "text/html; charset=utf-8" });
    }
    return c.body(fs.readFileSync(file), 200, { "content-type": mimeType(file) });
  });

  return app;
}
