import { test, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { assertGitRemote, checkoutSha, history, syncProject } from "../src/git.ts";
import { injectBridge, resolvePreviewFile } from "../src/preview.ts";
import { openDb } from "../src/db.ts";
import { createReviewer } from "../src/auth.ts";
import { createProject } from "../src/projects.ts";
import {
  addReply,
  createComment,
  exportProject,
  listOpenComments,
  setCommentStatus,
} from "../src/comments.ts";

function git(cwd: string, args: string[]) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || args.join(" "));
  }
}

function makeRepo(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dr-repo-"));
  git(dir, ["init", "-b", "main"]);
  git(dir, ["config", "user.email", "test@example.com"]);
  git(dir, ["config", "user.name", "Test"]);
  fs.mkdirSync(path.join(dir, "variant-a", "assets"), { recursive: true });
  fs.mkdirSync(path.join(dir, "variant-b"), { recursive: true });
  fs.writeFileSync(path.join(dir, "variant-a", "index.html"), "<html><body><h1>A1</h1></body></html>");
  fs.writeFileSync(path.join(dir, "variant-a", "assets", "pixel.png"), "png");
  fs.writeFileSync(path.join(dir, "variant-b", "index.html"), "<html><body><h1>B1</h1></body></html>");
  git(dir, ["add", "."]);
  git(dir, ["commit", "-m", "first"]);
  fs.writeFileSync(path.join(dir, "variant-a", "index.html"), "<html><body><h1>A2</h1></body></html>");
  git(dir, ["add", "."]);
  git(dir, ["commit", "-m", "second"]);
  return dir;
}

test("sync, history by path, checkout serves variant files", async () => {
  const repo = makeRepo();
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "dr-data-"));
  const project = {
    id: 1,
    git_url: repo,
    branch: "main",
    ssh_key_path: null,
  };
  const variants = [
    { key: "a", label: "A", git_path: "variant-a" },
    { key: "b", label: "B", git_path: "variant-b" },
  ];
  await syncProject(dataDir, project);
  const entries = await history(dataDir, project, variants);
  expect(entries.length).toBeGreaterThanOrEqual(2);
  expect(entries[0]?.subject).toBe("second");
  const dest = await checkoutSha(dataDir, project, entries[0]!.sha);
  expect(fs.readFileSync(path.join(dest, "variant-a", "index.html"), "utf8")).toContain("A2");
  expect(fs.readFileSync(path.join(dest, "variant-a", "assets", "pixel.png"), "utf8")).toBe("png");
});

test("resolvePreviewFile blocks traversal and finds assets", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dr-prev-"));
  fs.mkdirSync(path.join(root, "assets"));
  fs.writeFileSync(path.join(root, "index.html"), "<html></html>");
  fs.writeFileSync(path.join(root, "assets", "pixel.png"), "png");
  expect(resolvePreviewFile(root, "assets/pixel.png")).toContain("pixel.png");
  expect(resolvePreviewFile(root, "../secret")).toBeNull();
  expect(resolvePreviewFile(root, "/etc/passwd")).toBeNull();
  const outside = path.join(path.dirname(root), "secret.txt");
  fs.writeFileSync(outside, "nope");
  fs.symlinkSync(outside, path.join(root, "leak.txt"));
  expect(resolvePreviewFile(root, "leak.txt")).toBeNull();
});

test("git remotes reject option injection", () => {
  expect(() => assertGitRemote("--upload-pack=touch")).toThrow(/invalid git url/);
  expect(() => assertGitRemote("ext::sh -c id")).toThrow(/invalid git url/);
  assertGitRemote("https://github.com/example/design-review-tool.git");
  assertGitRemote("/tmp/repo");
  assertGitRemote("file:///review-repos/example.git");
  expect(() => assertGitRemote("file://-upload-pack=touch")).toThrow(/invalid git url/);
});

test("injectBridge inserts before body close", () => {
  const html = injectBridge("<html><body>Hi</body></html>", "/p/shop/bridge.js");
  expect(html).toContain('<script src="/p/shop/bridge.js"></script></body>');
});

test("bridge draws pin highlight and live rect overlay", () => {
  const pinTarget = fs.readFileSync(new URL("../src/pin-target.js", import.meta.url), "utf8");
  const src = [
    pinTarget,
    fs.readFileSync(new URL("../src/bridge.js", import.meta.url), "utf8"),
  ].join("\n");
  expect(src).toContain("dr-highlight");
  expect(src).toContain("dr-rect");
  expect(src).toContain("coverElement");
  expect(src).toContain("dr-mode-comment");
  expect(src).toContain("focus-anchor");
  expect(src).toContain("focusAnchor");
  expect(src).toContain("collectSpecs");
  expect(src).toContain("viewportBox");
  expect(src).toContain("resolvePinTarget");
  expect(src).toContain("[data-review-id], [data-od-id]");
});

test("open comments persist across SHAs; resolve hides them from default list", async () => {
  const db = openDb(path.join(fs.mkdtempSync(path.join(os.tmpdir(), "dr-c-")), "app.db"));
  const project = createProject(db, {
    slug: "shop",
    title: "Shop",
    gitUrl: "/tmp/repo",
    branch: "main",
    variants: [{ key: "a", label: "A", git_path: "variant-a" }],
  });
  const reviewer = await createReviewer(db, project.id, "Анна", "secret-anna");
  createComment(db, {
    projectId: project.id,
    reviewerId: reviewer.id,
    variantKey: "a",
    commitSha: "aaa1111",
    viewport: 390,
    kind: "element",
    selector: "h1",
    body: "quiet hero",
  });
  expect(listOpenComments(db, project.id, "a")).toHaveLength(1);
  const later = createComment(db, {
    projectId: project.id,
    reviewerId: reviewer.id,
    variantKey: "a",
    commitSha: "bbb2222",
    viewport: 1440,
    kind: "rect",
    rect: { x: 0.1, y: 0.1, w: 0.2, h: 0.2 },
    body: "too wide",
  });
  expect(listOpenComments(db, project.id, "a")).toHaveLength(2);
  createComment(db, {
    projectId: project.id,
    reviewerId: reviewer.id,
    variantKey: "a",
    commitSha: "ccc3333",
    viewport: 1440,
    kind: "page",
    body: "общий комментарий к странице",
  });
  expect(listOpenComments(db, project.id, "a")).toHaveLength(3);
  addReply(db, later.id, reviewer.id, "agreed");
  setCommentStatus(db, later.id, "resolved");
  expect(listOpenComments(db, project.id, "a")).toHaveLength(2);
  const exported = exportProject(db, project.id);
  expect(exported.comments).toHaveLength(3);
  expect(exported.replies).toHaveLength(1);
});
