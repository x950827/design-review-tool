import { FormEvent, useEffect, useMemo, useState } from "react";

type Variant = { key: string; label: string; git_path: string };
type HistoryEntry = { sha: string; subject: string; committedAt: string };
type Comment = {
  id: number;
  author_name: string;
  variant_key: string;
  commit_sha: string;
  viewport: number;
  kind: string;
  selector: string | null;
  body: string;
  status: string;
};
type Reply = { id: number; comment_id: number; author_name: string; body: string };

const VIEWPORTS = [390, 768, 1440];

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
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
  const [mode, setMode] = useState<"browse" | "comment" | "rect">("browse");
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<{ kind: "element" | "rect"; selector?: string; reviewId?: string; rect?: object } | null>(null);
  const [error, setError] = useState("");

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
    const onMessage = (event: MessageEvent) => {
      if (!event.data || event.data.source !== "design-review-bridge") return;
      if (event.data.type === "pin") {
        setPending({
          kind: "element",
          selector: event.data.selector,
          reviewId: event.data.reviewId,
        });
      }
      if (event.data.type === "rect") {
        setPending({ kind: "rect", rect: event.data.rect });
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  function sendMode(next: typeof mode, frame: HTMLIFrameElement | null) {
    setMode(next);
    frame?.contentWindow?.postMessage({ source: "design-review", type: "set-mode", mode: next }, "*");
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

  async function submitComment() {
    if (!pending || !draft.trim() || !sha) return;
    await api(`/p/${slug}/api/comments`, {
      method: "POST",
      body: JSON.stringify({
        variantKey: variant,
        commitSha: sha,
        viewport,
        kind: pending.kind,
        selector: pending.selector,
        reviewId: pending.reviewId,
        rect: pending.rect,
        body: draft,
      }),
    });
    setDraft("");
    setPending(null);
    await loadComments();
  }

  if (!me) {
    return (
      <form className="gate" onSubmit={onLogin}>
        <h1>{slug}</h1>
        <label>Имя</label>
        <input value={name} onChange={(e) => setName(e.target.value)} />
        <label>Пароль</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error ? <p className="error">{error}</p> : null}
        <button type="submit">Войти</button>
      </form>
    );
  }

  return (
    <div className="shell">
      <div className="toolbar">
        <strong>{title}</strong>
        <select value={variant} onChange={(e) => setVariant(e.target.value)}>
          {variants.map((item) => (
            <option key={item.key} value={item.key}>
              {item.label}
            </option>
          ))}
        </select>
        <select value={viewport} onChange={(e) => setViewport(Number(e.target.value))}>
          {VIEWPORTS.map((width) => (
            <option key={width} value={width}>
              {width}
            </option>
          ))}
        </select>
        <select value={sha} onChange={(e) => setSha(e.target.value)}>
          {history.map((entry) => (
            <option key={entry.sha} value={entry.sha}>
              {entry.sha.slice(0, 7)} {entry.subject}
            </option>
          ))}
        </select>
        <button type="button" onClick={(e) => sendMode("browse", (e.currentTarget.closest(".shell") as HTMLElement).querySelector("iframe"))}>
          Просмотр
        </button>
        <button type="button" onClick={(e) => sendMode("comment", (e.currentTarget.closest(".shell") as HTMLElement).querySelector("iframe"))}>
          Пин
        </button>
        <button type="button" onClick={(e) => sendMode("rect", (e.currentTarget.closest(".shell") as HTMLElement).querySelector("iframe"))}>
          Rect
        </button>
        <span>
          {me} · {mode}
        </span>
      </div>
      <div className="frame-wrap">
        {iframeSrc ? (
          <iframe title="preview" src={iframeSrc} style={{ width: viewport }} />
        ) : (
          <p>Нет коммитов — админ должен нажать Sync.</p>
        )}
      </div>
      <aside className="panel">
        {pending ? (
          <div className="thread">
            <p>
              Новый {pending.kind}
              {pending.selector ? ` · ${pending.selector}` : ""}
            </p>
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} />
            <button type="button" onClick={submitComment}>
              Сохранить
            </button>
          </div>
        ) : null}
        {comments.map((comment) => (
          <article className="thread" key={comment.id}>
            <strong>{comment.author_name}</strong>
            <div>{comment.body}</div>
            <small>
              {comment.viewport}px · {comment.commit_sha.slice(0, 7)} · {comment.kind}
              {comment.selector ? ` · ${comment.selector}` : ""}
            </small>
            {replies
              .filter((reply) => reply.comment_id === comment.id)
              .map((reply) => (
                <p key={reply.id}>
                  <strong>{reply.author_name}:</strong> {reply.body}
                </p>
              ))}
            <ReplyForm
              slug={slug}
              commentId={comment.id}
              onDone={loadComments}
            />
            <button
              type="button"
              onClick={async () => {
                await api(`/p/${slug}/api/comments/${comment.id}/status`, {
                  method: "POST",
                  body: JSON.stringify({ status: "resolved" }),
                });
                await loadComments();
              }}
            >
              Resolve
            </button>
          </article>
        ))}
      </aside>
    </div>
  );
}

function ReplyForm({
  slug,
  commentId,
  onDone,
}: {
  slug: string;
  commentId: number;
  onDone: () => Promise<void>;
}) {
  const [text, setText] = useState("");
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        if (!text.trim()) return;
        await api(`/p/${slug}/api/comments/${commentId}/replies`, {
          method: "POST",
          body: JSON.stringify({ body: text }),
        });
        setText("");
        await onDone();
      }}
    >
      <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ответ" />
    </form>
  );
}
