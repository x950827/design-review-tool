import { createHmac, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import type Database from "better-sqlite3";

const SALT_ROUNDS = 10;
const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export type ReviewerSession = {
  kind: "reviewer";
  reviewerId: number;
  projectId: number;
  slug: string;
  name: string;
  exp: number;
};

export type AdminSession = {
  kind: "admin";
  exp: number;
};

export type Session = ReviewerSession | AdminSession;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function signSession(session: Session, secret: string): string {
  const payload = Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
  const mac = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${mac}`;
}

export function readSession(token: string | undefined, secret: string): Session | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const mac = token.slice(dot + 1);
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Session;
    if (session.exp < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

export function reviewerCookieName(slug: string): string {
  return `dr_rev_${slug}`;
}

export const ADMIN_COOKIE = "dr_admin";

export function sessionExpiry(now = Date.now()): number {
  return now + SESSION_TTL_MS;
}

export type ReviewerRow = {
  id: number;
  project_id: number;
  name: string;
  password_hash: string;
  disabled: number;
};

export async function createReviewer(
  db: Database.Database,
  projectId: number,
  name: string,
  password: string,
): Promise<{ id: number; name: string }> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("name required");
  if (!password) throw new Error("password required");
  const password_hash = await hashPassword(password);
  const created_at = new Date().toISOString();
  const result = db
    .prepare(
      "INSERT INTO reviewers (project_id, name, password_hash, disabled, created_at) VALUES (?, ?, ?, 0, ?)",
    )
    .run(projectId, trimmed, password_hash, created_at);
  return { id: Number(result.lastInsertRowid), name: trimmed };
}

export async function loginReviewer(
  db: Database.Database,
  slug: string,
  name: string,
  password: string,
): Promise<ReviewerSession | null> {
  const row = db
    .prepare(
      `SELECT r.id, r.project_id, r.name, r.password_hash, r.disabled
       FROM reviewers r
       JOIN projects p ON p.id = r.project_id
       WHERE p.slug = ? AND r.name = ?`,
    )
    .get(slug, name.trim()) as ReviewerRow | undefined;
  if (!row || row.disabled) return null;
  const ok = await verifyPassword(password, row.password_hash);
  if (!ok) return null;
  return {
    kind: "reviewer",
    reviewerId: row.id,
    projectId: row.project_id,
    slug,
    name: row.name,
    exp: sessionExpiry(),
  };
}

export async function loginAdmin(
  password: string,
  adminPassword: string,
): Promise<AdminSession | null> {
  const a = Buffer.from(password);
  const b = Buffer.from(adminPassword);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return { kind: "admin", exp: sessionExpiry() };
}

export function setReviewerDisabled(
  db: Database.Database,
  reviewerId: number,
  disabled: boolean,
): void {
  db.prepare("UPDATE reviewers SET disabled = ? WHERE id = ?").run(disabled ? 1 : 0, reviewerId);
}

export async function resetReviewerPassword(
  db: Database.Database,
  reviewerId: number,
  password: string,
): Promise<void> {
  const password_hash = await hashPassword(password);
  db.prepare("UPDATE reviewers SET password_hash = ? WHERE id = ?").run(password_hash, reviewerId);
}

export class LoginLimiter {
  private hits = new Map<string, number[]>();

  constructor(
    private readonly windowMs = 60_000,
    private readonly max = 10,
  ) {}

  allow(key: string, now = Date.now()): boolean {
    const cutoff = now - this.windowMs;
    const next = (this.hits.get(key) ?? []).filter((t) => t > cutoff);
    if (next.length >= this.max) {
      this.hits.set(key, next);
      return false;
    }
    next.push(now);
    this.hits.set(key, next);
    return true;
  }
}
