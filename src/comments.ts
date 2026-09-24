import type Database from "better-sqlite3";

export const VIEWPORTS = [390, 768, 1440] as const;
export type Viewport = (typeof VIEWPORTS)[number];
export type CommentKind = "element" | "rect" | "page";
export type CommentStatus = "open" | "resolved";

export type CommentInput = {
  projectId: number;
  reviewerId: number;
  variantKey: string;
  commitSha: string;
  viewport: number;
  kind: CommentKind;
  selector?: string | null;
  reviewId?: string | null;
  rect?: { x: number; y: number; w: number; h: number } | null;
  body: string;
};

export type CommentRow = {
  id: number;
  project_id: number;
  reviewer_id: number;
  author_name: string;
  variant_key: string;
  commit_sha: string;
  viewport: number;
  kind: string;
  selector: string | null;
  review_id: string | null;
  rect_x: number | null;
  rect_y: number | null;
  rect_w: number | null;
  rect_h: number | null;
  body: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
};

export type ReplyRow = {
  id: number;
  comment_id: number;
  reviewer_id: number;
  author_name: string;
  body: string;
  created_at: string;
};

function assertViewport(n: number): asserts n is Viewport {
  if (!(VIEWPORTS as readonly number[]).includes(n)) {
    throw new Error("viewport must be 390, 768 or 1440");
  }
}

export function createComment(db: Database.Database, input: CommentInput): CommentRow {
  const body = input.body.trim();
  if (!body) throw new Error("body required");
  if (body.length > 8000) throw new Error("body too long");
  assertViewport(input.viewport);
  if (!["element", "rect", "page"].includes(input.kind)) {
    throw new Error("invalid kind");
  }
  const created_at = new Date().toISOString();
  const result = db
    .prepare(
      `INSERT INTO comments (
        project_id, reviewer_id, variant_key, commit_sha, viewport, kind,
        selector, review_id, rect_x, rect_y, rect_w, rect_h, body, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?)`,
    )
    .run(
      input.projectId,
      input.reviewerId,
      input.variantKey,
      input.commitSha,
      input.viewport,
      input.kind,
      input.selector ?? null,
      input.reviewId ?? null,
      input.rect?.x ?? null,
      input.rect?.y ?? null,
      input.rect?.w ?? null,
      input.rect?.h ?? null,
      body,
      created_at,
    );
  return getComment(db, Number(result.lastInsertRowid))!;
}

export function getComment(db: Database.Database, id: number): CommentRow | undefined {
  return db
    .prepare(
      `SELECT c.*, r.name AS author_name
       FROM comments c JOIN reviewers r ON r.id = c.reviewer_id
       WHERE c.id = ?`,
    )
    .get(id) as CommentRow | undefined;
}

export function listOpenComments(
  db: Database.Database,
  projectId: number,
  variantKey: string,
): CommentRow[] {
  return db
    .prepare(
      `SELECT c.*, r.name AS author_name
       FROM comments c JOIN reviewers r ON r.id = c.reviewer_id
       WHERE c.project_id = ? AND c.variant_key = ? AND c.status = 'open'
       ORDER BY c.created_at ASC`,
    )
    .all(projectId, variantKey) as CommentRow[];
}

export function addReply(
  db: Database.Database,
  commentId: number,
  reviewerId: number,
  body: string,
): ReplyRow {
  const text = body.trim();
  if (!text) throw new Error("body required");
  if (text.length > 8000) throw new Error("body too long");
  const created_at = new Date().toISOString();
  const result = db
    .prepare("INSERT INTO replies (comment_id, reviewer_id, body, created_at) VALUES (?, ?, ?, ?)")
    .run(commentId, reviewerId, text, created_at);
  return db
    .prepare(
      `SELECT rp.*, r.name AS author_name
       FROM replies rp JOIN reviewers r ON r.id = rp.reviewer_id
       WHERE rp.id = ?`,
    )
    .get(Number(result.lastInsertRowid)) as ReplyRow;
}

export function listReplies(db: Database.Database, commentIds: number[]): ReplyRow[] {
  if (!commentIds.length) return [];
  const placeholders = commentIds.map(() => "?").join(",");
  return db
    .prepare(
      `SELECT rp.*, r.name AS author_name
       FROM replies rp JOIN reviewers r ON r.id = rp.reviewer_id
       WHERE rp.comment_id IN (${placeholders})
       ORDER BY rp.created_at ASC`,
    )
    .all(...commentIds) as ReplyRow[];
}

export function setCommentStatus(
  db: Database.Database,
  commentId: number,
  status: CommentStatus,
): CommentRow {
  if (status !== "open" && status !== "resolved") throw new Error("invalid status");
  const resolved_at = status === "resolved" ? new Date().toISOString() : null;
  db.prepare("UPDATE comments SET status = ?, resolved_at = ? WHERE id = ?").run(
    status,
    resolved_at,
    commentId,
  );
  return getComment(db, commentId)!;
}

export function exportProject(db: Database.Database, projectId: number) {
  const comments = db
    .prepare(
      `SELECT c.*, r.name AS author_name
       FROM comments c JOIN reviewers r ON r.id = c.reviewer_id
       WHERE c.project_id = ?
       ORDER BY c.created_at ASC`,
    )
    .all(projectId) as CommentRow[];
  const replies = listReplies(
    db,
    comments.map((c) => c.id),
  );
  return { comments, replies };
}
