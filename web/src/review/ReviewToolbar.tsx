import {
  IconBrowse,
  IconChevronDown,
  IconComments,
  IconDesktop,
  IconPhone,
  IconRect,
} from "../icons";
import type { HistoryEntry, ReviewMode, Variant } from "../types";

const VIEWPORT_META: Record<number, { label: string; tip: string; icon: "phone" | "tablet" | "desktop" }> = {
  390: { label: "Мобильный 390", tip: "Мобильный · 390", icon: "phone" },
  768: { label: "Планшет 768", tip: "Планшет · 768", icon: "tablet" },
  1440: { label: "Десктоп 1440", tip: "Десктоп · 1440", icon: "desktop" },
};

export function ReviewToolbar({
  me,
  variants,
  variant,
  onVariant,
  viewports,
  viewport,
  onViewport,
  history,
  sha,
  onSha,
  mode,
  onMode,
  commentsOpen,
  onCommentsOpen,
  onHideDock,
}: {
  me: string;
  variants: Variant[];
  variant: string;
  onVariant: (key: string) => void;
  viewports: number[];
  viewport: number;
  onViewport: (width: number) => void;
  history: HistoryEntry[];
  sha: string;
  onSha: (sha: string) => void;
  mode: ReviewMode;
  onMode: (mode: ReviewMode) => void;
  commentsOpen: boolean;
  onCommentsOpen: (open: boolean) => void;
  onHideDock: () => void;
}) {
  const initial = me.trim().charAt(0).toUpperCase() || "?";
  return (
    <div className="dock motion-dock" role="toolbar" aria-label="Параметры ревью">
      <button
        type="button"
        className="dock-hide has-tip"
        aria-label="Скрыть панель"
        data-tip="Скрыть панель"
        onClick={onHideDock}
      >
        <IconChevronDown />
      </button>
      <div className="dock-shell">
        <div className="dock-track">
          <a
            className="dock-brand has-tip"
            href="/admin"
            aria-label="Design Review"
            data-tip="Design Review"
          >
            <img src="/design-review-mark.svg" alt="" width={24} height={24} />
          </a>
          {variants.length ? (
            <div className="seg" role="group" aria-label="Вариант">
              {variants.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  aria-pressed={item.key === variant}
                  onClick={() => onVariant(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}
          <div className="seg icon-widths" role="group" aria-label="Ширина">
            {viewports.map((width) => {
              const meta = VIEWPORT_META[width] ?? {
                label: String(width),
                tip: String(width),
                icon: "desktop" as const,
              };
              return (
                <button
                  key={width}
                  type="button"
                  className="has-tip"
                  data-width={width}
                  aria-pressed={width === viewport}
                  aria-label={meta.label}
                  data-tip={meta.tip}
                  onClick={() => onViewport(width)}
                >
                  {meta.icon === "desktop" ? (
                    <IconDesktop />
                  ) : (
                    <IconPhone className={meta.icon === "tablet" ? "icon-rot-90" : undefined} />
                  )}
                </button>
              );
            })}
          </div>
          <select
            className="select num"
            aria-label="Коммит"
            value={sha}
            onChange={(event) => onSha(event.currentTarget.value)}
          >
            {history.map((entry) => (
              <option key={entry.sha} value={entry.sha}>
                {entry.sha.slice(0, 7)} · {entry.subject}
              </option>
            ))}
          </select>
          <span className="dock-divider" aria-hidden="true" />
          <div className="icon-seg" role="group" aria-label="Режим">
            <button
              type="button"
              className="has-tip"
              aria-pressed={mode === "browse"}
              aria-label="Просмотр"
              data-tip="Просмотр"
              onClick={() => onMode("browse")}
            >
              <IconBrowse />
            </button>
            <button
              type="button"
              className="has-tip"
              aria-pressed={mode === "comment"}
              aria-label="Элемент"
              data-tip="Элемент"
              onClick={() => onMode("comment")}
            >
              <IconComments />
            </button>
            <button
              type="button"
              className="has-tip"
              aria-pressed={mode === "rect"}
              aria-label="Выделить"
              data-tip="Выделить"
              onClick={() => onMode("rect")}
            >
              <IconRect />
            </button>
          </div>
          <span className="user-badge">
            <span className="avatar">{initial}</span>
            {me}
          </span>
          <button
            type="button"
            className="icon-btn has-tip dock-comments"
            aria-label="Комментарии"
            data-tip="Комментарии"
            aria-pressed={commentsOpen}
            onClick={() => onCommentsOpen(true)}
          >
            <IconComments />
          </button>
        </div>
      </div>
    </div>
  );
}
