import { FormEvent, useEffect, useRef, useState } from "react";
import { IconHideComments, IconPlus } from "../icons";
import type { Comment, Reply } from "../types";

const KIND_LABEL: Record<string, string> = {
  element: "элемент",
  rect: "выделить",
  page: "страница",
};

export function CommentsPanel({
  comments,
  replies,
  freeOpen,
  onFreeOpen,
  focusError,
  focusedId,
  onReveal,
  onSubmitFree,
  onResolve,
  onReply,
  onClose,
}: {
  comments: Comment[];
  replies: Reply[];
  freeOpen: boolean;
  onFreeOpen: (open: boolean) => void;
  focusError: string;
  focusedId: number | null;
  onReveal: (comment: Comment) => void;
  onSubmitFree: (body: string) => Promise<void>;
  onResolve: (id: number) => void;
  onReply: (commentId: number, body: string) => Promise<void>;
  onClose: () => void;
}) {
  const [freeDraft, setFreeDraft] = useState("");
  const freeRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (freeOpen) {
      setFreeDraft("");
      freeRef.current?.focus();
    }
  }, [freeOpen]);

  return (
    <aside className="comments motion-panel" aria-label="Комментарии">
      <div className="comments-head">
        <h2>Комментарии</h2>
        <div className="comments-head-actions">
          <button
            type="button"
            className="icon-btn has-tip tip-left"
            aria-label="Новый комментарий"
            data-tip="Новый комментарий"
            aria-pressed={freeOpen}
            onClick={() => onFreeOpen(!freeOpen)}
          >
            <IconPlus />
          </button>
          <button
            type="button"
            className="icon-btn has-tip tip-left"
            aria-label="Скрыть комментарии"
            data-tip="Скрыть комментарии"
            onClick={onClose}
          >
            <IconHideComments />
          </button>
        </div>
      </div>
      <div className="comments-body">
        {freeOpen ? (
          <div className="composer motion-in">
            <p className="composer-title">Новый комментарий</p>
            <p className="composer-hint">Без привязки к элементу или выделению</p>
            <div className="field" style={{ marginBottom: 10 }}>
              <textarea
                ref={freeRef}
                className="textarea"
                placeholder="Комментарий"
                aria-label="Комментарий"
                value={freeDraft}
                onChange={(event) => setFreeDraft(event.currentTarget.value)}
              />
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={async () => {
                const body = freeDraft.trim();
                if (!body) return;
                await onSubmitFree(body);
                setFreeDraft("");
              }}
            >
              Сохранить
            </button>
          </div>
        ) : null}
        {focusError ? (
          <div className="anchor-error" role="alert">
            {focusError}
          </div>
        ) : null}
        {comments.length === 0 && !freeOpen ? (
          <div className="comments-empty">Нет открытых комментариев</div>
        ) : null}
        {comments.map((comment, index) => (
          <article
            key={comment.id}
            className={
              focusedId === comment.id
                ? "thread active motion-in"
                : index
                  ? `thread motion-in motion-d${Math.min(index, 2)}`
                  : "thread motion-in"
            }
            onClick={(event) => {
              const target = event.target as HTMLElement;
              if (target.closest("form, button, input, textarea, a")) return;
              onReveal(comment);
            }}
          >
            <p className="thread-author">{comment.author_name}</p>
            <p className="thread-text">{comment.body}</p>
            <div className="thread-meta">
              <span className="num">{comment.viewport}px</span>
              <span className="num">{comment.commit_sha.slice(0, 7)}</span>
              <span>{KIND_LABEL[comment.kind] ?? comment.kind}</span>
              {comment.selector ? <span className="num">{comment.selector}</span> : null}
            </div>
            {replies.some((reply) => reply.comment_id === comment.id) ? (
              <div className="thread-replies">
                {replies
                  .filter((reply) => reply.comment_id === comment.id)
                  .map((reply) => (
                    <p key={reply.id}>
                      <strong>{reply.author_name}:</strong> {reply.body}
                    </p>
                  ))}
              </div>
            ) : null}
            <ReplyForm commentId={comment.id} onReply={onReply} />
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => onResolve(comment.id)}
            >
              Resolve
            </button>
          </article>
        ))}
      </div>
    </aside>
  );
}

function ReplyForm({
  commentId,
  onReply,
}: {
  commentId: number;
  onReply: (commentId: number, body: string) => Promise<void>;
}) {
  const [text, setText] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;
    await onReply(commentId, text);
    setText("");
  }
  return (
    <form className="reply-row" onSubmit={submit}>
      <input
        className="input"
        placeholder="Ответ"
        aria-label="Ответ"
        value={text}
        onChange={(event) => setText(event.currentTarget.value)}
      />
      <button type="submit" className="btn btn-secondary btn-sm">
        Ответ
      </button>
    </form>
  );
}
