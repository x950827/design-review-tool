import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { api } from "./api";
import { IconComments, IconDock } from "./icons";
import { LoginScreen } from "./LoginScreen";
import { AnchorDrafts } from "./review/AnchorDrafts";
import { CommentsPanel } from "./review/CommentsPanel";
import { ReviewToolbar } from "./review/ReviewToolbar";
import type { Comment, HistoryEntry, PendingAnchor, PinSpecs, Reply, ReviewMode, Variant, ViewportBox } from "./types";
import { Field, PasswordField } from "./ui";
import { useMediaQuery } from "./useMediaQuery";

const VIEWPORTS = [390, 768, 1440];

function asBox(value: unknown): ViewportBox | undefined {
  if (!value || typeof value !== "object") return undefined;
  const box = value as ViewportBox;
  if (![box.x, box.y, box.w, box.h].every((n) => typeof n === "number")) return undefined;
  return box;
}

function asSpecs(value: unknown): PinSpecs | undefined {
  if (!value || typeof value !== "object") return undefined;
  const specs = value as PinSpecs;
  if (![specs.size, specs.color, specs.bg, specs.font, specs.line].every((n) => typeof n === "string")) {
    return undefined;
  }
  return specs;
}

export function ReviewApp({ slug }: { slug: string }) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [me, setMe] = useState("");
  const [title, setTitle] = useState("");
  const [variants, setVariants] = useState<Variant[]>([]);
  const [variant, setVariant] = useState("a");
  const [viewport, setViewport] = useState(1440);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [sha, setSha] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [mode, setMode] = useState<ReviewMode>("browse");
  const [pending, setPending] = useState<PendingAnchor | null>(null);
  const [freeOpen, setFreeOpen] = useState(false);
  const [focusedId, setFocusedId] = useState<number | null>(null);
  const [focusError, setFocusError] = useState("");
  const [error, setError] = useState("");
  const [commentsOpen, setCommentsOpen] = useState(true);
  const [dockOpen, setDockOpen] = useState(true);
  const frameRef = useRef<HTMLDivElement>(null);
  const compact = useMediaQuery("(max-width: 900px)");
  const phone = useMediaQuery("(max-width: 640px)");

  const iframeSrc = useMemo(() => {
    if (!sha) return "";
    return `/p/${slug}/files/${sha}/${variant}/index.html`;
  }, [slug, sha, variant]);

  async function loadSession() {
    const session = await api(`/p/${slug}/api/session`);
    setMe(session.name);
    setTitle(session.project.title);
    setVariants(session.project.variants);
    setVariant(session.project.variants[0]?.key ?? "a");
    const hist = await api(`/p/${slug}/api/history`);
    setHistory(hist.history);
    setSha(hist.history[0]?.sha ?? "");
  }

  async function loadComments(nextVariant = variant) {
    const data = await api(`/p/${slug}/api/comments?variant=${encodeURIComponent(nextVariant)}`);
    setComments(data.comments);
    setReplies(data.replies);
  }

  useEffect(() => {
    api(`/p/${slug}/api/session`)
      .then(async () => {
        await loadSession();
      })
      .catch(() => setMe(""));
  }, [slug]);

  useEffect(() => {
    if (!me) return;
    loadComments(variant).catch(() => undefined);
  }, [me, variant, slug]);

  useEffect(() => {
    setPending(null);
    previewFrame()?.contentWindow?.postMessage(
      { source: "design-review", type: "set-mode", mode },
      window.location.origin,
    );
  }, [iframeSrc, viewport]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (!event.data || event.data.source !== "design-review-bridge") return;
      if (event.data.type === "pin") {
        setFreeOpen(false);
        setPending({
          kind: "element",
          selector: event.data.selector,
          reviewId: event.data.reviewId,
          box: asBox(event.data.box),
          specs: asSpecs(event.data.specs),
        });
      }
      if (event.data.type === "rect") {
        setFreeOpen(false);
        setPending({
          kind: "rect",
          rect: asBox(event.data.rect),
          box: asBox(event.data.box),
        });
      }
      if (event.data.type === "focus-result") {
        setFocusError(event.data.ok ? "" : "Элемент не найден на этой версии");
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    if (compact && commentsOpen && dockOpen) setDockOpen(false);
  }, [compact]);

  function openComments() {
    setCommentsOpen(true);
    if (compact) setDockOpen(false);
  }

  function closeComments() {
    setCommentsOpen(false);
    setFreeOpen(false);
  }

  function openDock() {
    setDockOpen(true);
    if (compact) setCommentsOpen(false);
  }

  function previewFrame(): HTMLIFrameElement | null {
    return frameRef.current?.querySelector("iframe") ?? document.querySelector("iframe");
  }

  function sendMode(next: ReviewMode, frame: HTMLIFrameElement | null = previewFrame()) {
    if (next !== mode) setPending(null);
    setMode(next);
    frame?.contentWindow?.postMessage(
      { source: "design-review", type: "set-mode", mode: next },
      window.location.origin,
    );
  }

  function revealComment(comment: Comment) {
    if (comment.kind !== "element" && comment.kind !== "rect") return;
    setPending(null);
    setFocusedId(comment.id);
    setFocusError("");
    setMode("browse");
    if ((VIEWPORTS as readonly number[]).includes(comment.viewport)) {
      setViewport(comment.viewport);
    }
    const payload = {
      source: "design-review",
      type: "focus-anchor",
      kind: comment.kind,
      selector: comment.selector,
      rect:
        comment.kind === "rect" && comment.rect_x != null
          ? {
              x: comment.rect_x,
              y: comment.rect_y,
              w: comment.rect_w,
              h: comment.rect_h,
            }
          : null,
    };
    window.setTimeout(() => {
      const frame = previewFrame();
      frame?.contentWindow?.postMessage(
        { source: "design-review", type: "set-mode", mode: "browse" },
        window.location.origin,
      );
      frame?.contentWindow?.postMessage(payload, window.location.origin);
    }, 80);
  }

  async function onLogin(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await api(`/p/${slug}/api/login`, {
        method: "POST",
        body: JSON.stringify({ name, password }),
      });
      await loadSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ошибка");
    }
  }

  async function postComment(input: {
    kind: "element" | "rect" | "page";
    body: string;
    selector?: string;
    reviewId?: string;
    rect?: ViewportBox;
  }) {
    if (!sha) return;
    await api(`/p/${slug}/api/comments`, {
      method: "POST",
      body: JSON.stringify({
        variantKey: variant,
        commitSha: sha,
        viewport,
        kind: input.kind,
        selector: input.selector,
        reviewId: input.reviewId,
        rect: input.rect,
        body: input.body,
      }),
    });
    await loadComments();
  }

  async function submitPending(body: string) {
    if (!pending) return;
    await postComment({
      kind: pending.kind,
      body,
      selector: pending.kind === "element" ? pending.selector : undefined,
      reviewId: pending.kind === "element" ? pending.reviewId : undefined,
      rect: pending.kind === "rect" ? pending.rect : undefined,
    });
    setPending(null);
    openComments();
    sendMode(mode);
  }

  async function submitFree(body: string) {
    await postComment({ kind: "page", body });
    setFreeOpen(false);
  }

  if (!me) {
    return (
      <LoginScreen href={`/p/${slug}`} heading={slug} error={error} onSubmit={onLogin}>
        <Field label="Имя" htmlFor="review-name">
          <input
            className="input"
            id="review-name"
            autoComplete="username"
            value={name}
            onChange={(event) => setName(event.currentTarget.value)}
          />
        </Field>
        <PasswordField
          id="review-password"
          label="Пароль"
          value={password}
          onChange={setPassword}
        />
      </LoginScreen>
    );
  }

  const shellClass = [
    "review",
    commentsOpen ? "" : "comments-collapsed",
    dockOpen ? "" : "dock-collapsed",
    compact ? "shell-compact" : "",
    phone ? "shell-phone" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const frameMode = mode === "comment" ? "pin" : mode === "rect" ? "rect" : "pan";
  const frameClass = [
    "frame-wrap",
    `frame-w-${viewport}`,
    commentsOpen ? "" : "wide-full",
    "motion-in-scale",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={shellClass} aria-label={title}>
      <div className="review-body">
        <div className="stage">
          {iframeSrc ? (
            <div className={frameClass} data-mode={frameMode} ref={frameRef}>
              <iframe
                title="Превью"
                src={iframeSrc}
                onLoad={(event) => {
                  event.currentTarget.contentWindow?.postMessage(
                    { source: "design-review", type: "set-mode", mode },
                    window.location.origin,
                  );
                }}
              />
              <AnchorDrafts
                pending={pending}
                frameRef={frameRef}
                onSubmit={submitPending}
                onCancelRect={() => sendMode("browse")}
              />
            </div>
          ) : (
            <div className="empty-stage motion-in-scale">
              <h2>Нет коммитов</h2>
              <p>Нет коммитов — админ должен нажать Sync.</p>
            </div>
          )}
          <button
            type="button"
            className="show-comments has-tip tip-left"
            aria-label="Показать комментарии"
            data-tip="Показать комментарии"
            hidden={commentsOpen}
            onClick={openComments}
          >
            <IconComments />
          </button>
          <button
            type="button"
            className="icon-btn show-dock has-tip"
            aria-label="Показать панель"
            data-tip="Показать панель"
            hidden={dockOpen}
            onClick={openDock}
          >
            <IconDock />
          </button>
          {dockOpen ? (
            <ReviewToolbar
              me={me}
              variants={variants}
              variant={variant}
              onVariant={setVariant}
              viewports={VIEWPORTS}
              viewport={viewport}
              onViewport={setViewport}
              history={history}
              sha={sha}
              onSha={setSha}
              mode={mode}
              onMode={(next) => sendMode(next)}
              commentsOpen={commentsOpen}
              onCommentsOpen={openComments}
              onHideDock={() => setDockOpen(false)}
            />
          ) : null}
        </div>
        {commentsOpen ? (
          <CommentsPanel
            comments={comments}
            replies={replies}
            freeOpen={freeOpen}
            onFreeOpen={(open) => {
              if (open) {
                setPending(null);
                sendMode(mode);
              }
              setFreeOpen(open);
            }}
            focusError={focusError}
            focusedId={focusedId}
            onReveal={revealComment}
            onSubmitFree={submitFree}
            onResolve={async (id) => {
              await api(`/p/${slug}/api/comments/${id}/status`, {
                method: "POST",
                body: JSON.stringify({ status: "resolved" }),
              });
              await loadComments();
            }}
            onReply={async (commentId, body) => {
              await api(`/p/${slug}/api/comments/${commentId}/replies`, {
                method: "POST",
                body: JSON.stringify({ body }),
              });
              await loadComments();
            }}
            onClose={closeComments}
          />
        ) : null}
      </div>
    </div>
  );
}
