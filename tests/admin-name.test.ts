import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, test } from "vitest";
import { createComment } from "../src/comments.ts";
import { openDb } from "../src/db.ts";
import { createProject, listReviewers, renameLegacyAdminReviewers } from "../src/projects.ts";

function tempDb() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dr-admin-name-"));
  return openDb(path.join(dir, "app.db"));
}

test("Админ is renamed to admin and the comment stays on that reviewer", () => {
  const db = tempDb();
  const project = createProject(db, {
    slug: "shop",
    title: "Shop",
    gitUrl: "/tmp/x",
    branch: "main",
    variants: [{ key: "a", label: "A", git_path: "variant-a" }],
  });
  const inserted = db
    .prepare(
      "INSERT INTO reviewers (project_id, name, password_hash, disabled, created_at) VALUES (?, 'Админ', 'hash', 0, ?)",
    )
    .run(project.id, new Date().toISOString());
  const reviewerId = Number(inserted.lastInsertRowid);
  createComment(db, {
    projectId: project.id,
    reviewerId,
    variantKey: "a",
    commitSha: "abc1234",
    viewport: 390,
    kind: "page",
    body: "tone",
  });
  renameLegacyAdminReviewers(db);
  expect(listReviewers(db, project.id).map((r) => r.name)).toEqual(["admin"]);
  const author = db
    .prepare(
      "SELECT r.name AS author_name FROM comments c JOIN reviewers r ON r.id = c.reviewer_id WHERE c.project_id = ?",
    )
    .get(project.id) as { author_name: string };
  expect(author.author_name).toBe("admin");
});

test("an existing admin row keeps a separate Админ row", () => {
  const db = tempDb();
  const project = createProject(db, {
    slug: "shop",
    title: "Shop",
    gitUrl: "/tmp/x",
    branch: "main",
    variants: [{ key: "a", label: "A", git_path: "variant-a" }],
  });
  const now = new Date().toISOString();
  const insert = db.prepare(
    "INSERT INTO reviewers (project_id, name, password_hash, disabled, created_at) VALUES (?, ?, 'hash', 0, ?)",
  );
  insert.run(project.id, "admin", now);
  insert.run(project.id, "Админ", now);
  renameLegacyAdminReviewers(db);
  expect(listReviewers(db, project.id).map((r) => r.name).sort()).toEqual(["admin", "Админ"]);
});
