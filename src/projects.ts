import type Database from "better-sqlite3";
import { createReviewer, resetReviewerPassword, setReviewerDisabled } from "./auth.ts";
import { assertGitRemote, assertGitRevision, type Variant } from "./git.ts";

export type Project = {
  id: number;
  slug: string;
  title: string;
  git_url: string;
  branch: string;
  ssh_key_path: string | null;
  created_at: string;
};

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/;

export function createProject(
  db: Database.Database,
  input: {
    slug: string;
    title: string;
    gitUrl: string;
    branch: string;
    sshKeyPath?: string | null;
    variants: Variant[];
  },
): Project {
  if (!SLUG_RE.test(input.slug)) {
    throw new Error("slug must be lowercase letters, digits and dashes");
  }
  if (!input.variants.length) throw new Error("at least one variant required");
  assertGitRemote(input.gitUrl);
  assertGitRevision(input.branch);
  const created_at = new Date().toISOString();
  const result = db
    .prepare(
      "INSERT INTO projects (slug, title, git_url, branch, ssh_key_path, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run(
      input.slug,
      input.title.trim(),
      input.gitUrl,
      input.branch.trim() || "main",
      input.sshKeyPath ?? null,
      created_at,
    );
  const id = Number(result.lastInsertRowid);
  const insertVariant = db.prepare(
    "INSERT INTO variants (project_id, key, label, git_path) VALUES (?, ?, ?, ?)",
  );
  for (const v of input.variants) {
    insertVariant.run(id, v.key, v.label, v.git_path.replace(/^\/+/, ""));
  }
  return getProjectById(db, id)!;
}

export function listProjects(db: Database.Database): Project[] {
  return db.prepare("SELECT * FROM projects ORDER BY id DESC").all() as Project[];
}

export function getProjectById(db: Database.Database, id: number): Project | undefined {
  return db.prepare("SELECT * FROM projects WHERE id = ?").get(id) as Project | undefined;
}

export function getProjectBySlug(db: Database.Database, slug: string): Project | undefined {
  return db.prepare("SELECT * FROM projects WHERE slug = ?").get(slug) as Project | undefined;
}

export function listReviewers(db: Database.Database, projectId: number) {
  return db
    .prepare("SELECT id, name, disabled, created_at FROM reviewers WHERE project_id = ? ORDER BY id")
    .all(projectId) as { id: number; name: string; disabled: number; created_at: string }[];
}

export const ADMIN_REVIEWER_NAME = "admin";

export function renameLegacyAdminReviewers(db: Database.Database): void {
  db.prepare(
    `UPDATE reviewers
     SET name = 'admin'
     WHERE name = 'Админ'
       AND NOT EXISTS (
         SELECT 1 FROM reviewers taken
         WHERE taken.project_id = reviewers.project_id AND taken.name = 'admin'
       )`,
  ).run();
}

export async function ensureAdminReviewer(
  db: Database.Database,
  projectId: number,
  adminPassword: string,
): Promise<void> {
  const existing = db
    .prepare("SELECT id FROM reviewers WHERE project_id = ? AND name = ?")
    .get(projectId, ADMIN_REVIEWER_NAME) as { id: number } | undefined;
  if (existing) {
    await resetReviewerPassword(db, existing.id, adminPassword);
    db.prepare("UPDATE reviewers SET disabled = 0 WHERE id = ?").run(existing.id);
    return;
  }
  await createReviewer(db, projectId, ADMIN_REVIEWER_NAME, adminPassword);
}

export { createReviewer, resetReviewerPassword, setReviewerDisabled };
