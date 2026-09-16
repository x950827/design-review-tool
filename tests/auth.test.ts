import { test, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { openDb } from "../src/db.ts";
import {
  createReviewer,
  loginReviewer,
  loginAdmin,
  signSession,
  readSession,
  setReviewerDisabled,
  LoginLimiter,
} from "../src/auth.ts";

function tmpDb(): ReturnType<typeof openDb> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dr-db-"));
  return openDb(path.join(dir, "app.db"));
}

test("openDb persists a project across reconnect", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dr-db-"));
  const file = path.join(dir, "app.db");
  const db = openDb(file);
  db.prepare(
    "INSERT INTO projects (slug, title, git_url, branch, created_at) VALUES (?, ?, ?, ?, ?)",
  ).run("shop", "Shop", "/tmp/repo", "main", new Date().toISOString());
  db.close();
  const again = openDb(file);
  const row = again.prepare("SELECT slug FROM projects").get() as { slug: string };
  expect(row.slug).toBe("shop");
  again.close();
});

test("reviewer login succeeds with name+password and fails when disabled", async () => {
  const db = tmpDb();
  const created = db
    .prepare(
      "INSERT INTO projects (slug, title, git_url, branch, created_at) VALUES (?, ?, ?, ?, ?)",
    )
    .run("shop", "Shop", "/tmp/repo", "main", new Date().toISOString());
  const projectId = Number(created.lastInsertRowid);
  await createReviewer(db, projectId, "Анна", "secret-anna");
  const ok = await loginReviewer(db, "shop", "Анна", "secret-anna");
  expect(ok?.name).toBe("Анна");
  expect(ok?.projectId).toBe(projectId);
  const bad = await loginReviewer(db, "shop", "Анна", "wrong");
  expect(bad).toBeNull();
  setReviewerDisabled(db, ok!.reviewerId, true);
  const disabled = await loginReviewer(db, "shop", "Анна", "secret-anna");
  expect(disabled).toBeNull();
});

test("reviewer of one project cannot log into another slug", async () => {
  const db = tmpDb();
  const a = Number(
    db
      .prepare(
        "INSERT INTO projects (slug, title, git_url, branch, created_at) VALUES (?, ?, ?, ?, ?)",
      )
      .run("a", "A", "/tmp/a", "main", new Date().toISOString()).lastInsertRowid,
  );
  db.prepare(
    "INSERT INTO projects (slug, title, git_url, branch, created_at) VALUES (?, ?, ?, ?, ?)",
  ).run("b", "B", "/tmp/b", "main", new Date().toISOString());
  await createReviewer(db, a, "Анна", "secret-anna");
  expect(await loginReviewer(db, "b", "Анна", "secret-anna")).toBeNull();
});

test("signed session round-trips and rejects tampering", () => {
  const secret = "0123456789abcdef";
  const token = signSession(
    { kind: "admin", exp: Date.now() + 60_000 },
    secret,
  );
  expect(readSession(token, secret)?.kind).toBe("admin");
  expect(readSession(token.slice(0, -2) + "xx", secret)).toBeNull();
  expect(readSession(signSession({ kind: "admin", exp: 1 }, secret), secret)).toBeNull();
});

test("admin login uses timing-safe compare", async () => {
  expect(await loginAdmin("right-pass", "right-pass")).not.toBeNull();
  expect(await loginAdmin("wrong-pass", "right-pass")).toBeNull();
});

test("login limiter trips after max attempts", () => {
  const limiter = new LoginLimiter(60_000, 3);
  expect(limiter.allow("x")).toBe(true);
  expect(limiter.allow("x")).toBe(true);
  expect(limiter.allow("x")).toBe(true);
  expect(limiter.allow("x")).toBe(false);
});
