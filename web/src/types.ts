export type Variant = { key: string; label: string; git_path: string };
export type HistoryEntry = { sha: string; subject: string; committedAt: string };
export type Comment = {
  id: number;
  author_name: string;
  variant_key: string;
  commit_sha: string;
  viewport: number;
  kind: string;
  selector: string | null;
  rect_x: number | null;
  rect_y: number | null;
  rect_w: number | null;
  rect_h: number | null;
  body: string;
  status: string;
};
export type Reply = { id: number; comment_id: number; author_name: string; body: string };
export type Reviewer = { id: number; name: string; disabled: number };
export type Project = {
  id: number;
  slug: string;
  title: string;
  git_url: string;
  branch: string;
  variants: Variant[];
  reviewers: Reviewer[];
};
export type ReviewMode = "browse" | "comment" | "rect";
export type ViewportBox = { x: number; y: number; w: number; h: number };
export type PinSpecs = {
  size: string;
  color: string;
  bg: string;
  font: string;
  line: string;
};
export type PendingAnchor =
  | {
      kind: "element";
      selector?: string;
      reviewId?: string;
      box?: ViewportBox;
      specs?: PinSpecs;
    }
  | {
      kind: "rect";
      rect?: ViewportBox;
      box?: ViewportBox;
    };
