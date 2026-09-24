import {
  IconBrowse,
  IconChevronDown,
  IconComments,
  IconDesktop,
  IconPhone,
  IconRect,
} from "../icons";
import { LangSwitch, useI18n } from "../i18n";
import type { MessageKey } from "../messages";
import type { HistoryEntry, ReviewMode, Variant } from "../types";

const VIEWPORT_META: Record<number, { label: MessageKey; tip: MessageKey; icon: "phone" | "tablet" | "desktop" }> = {
  390: { label: "viewport390", tip: "viewport390Tip", icon: "phone" },
  768: { label: "viewport768", tip: "viewport768Tip", icon: "tablet" },
  1440: { label: "viewport1440", tip: "viewport1440Tip", icon: "desktop" },
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
  const { t } = useI18n();
  const initial = me.trim().charAt(0).toUpperCase() || "?";
  return (
    <div className="dock motion-dock" role="toolbar" aria-label={t("reviewToolbar")}>
      <button
        type="button"
        className="dock-hide has-tip"
        aria-label={t("hideDock")}
        data-tip={t("hideDock")}
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
            <div className="seg variant-seg" role="group" aria-label={t("variant")}>
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
          <div className="seg icon-widths" role="group" aria-label={t("width")}>
            {viewports.map((width) => {
              const meta = VIEWPORT_META[width] ?? {
                label: "viewport1440" as const,
                tip: "viewport1440Tip" as const,
                icon: "desktop" as const,
              };
              return (
                <button
                  key={width}
                  type="button"
                  className="has-tip"
                  data-width={width}
                  aria-pressed={width === viewport}
                  aria-label={t(meta.label)}
                  data-tip={t(meta.tip)}
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
            aria-label={t("commit")}
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
          <div className="icon-seg" role="group" aria-label={t("mode")}>
            <button
              type="button"
              className="has-tip"
              aria-pressed={mode === "browse"}
              aria-label={t("browse")}
              data-tip={t("browse")}
              onClick={() => onMode("browse")}
            >
              <IconBrowse />
            </button>
            <button
              type="button"
              className="has-tip"
              aria-pressed={mode === "comment"}
              aria-label={t("element")}
              data-tip={t("element")}
              onClick={() => onMode("comment")}
            >
              <IconComments />
            </button>
            <button
              type="button"
              className="has-tip"
              aria-pressed={mode === "rect"}
              aria-label={t("rect")}
              data-tip={t("rect")}
              onClick={() => onMode("rect")}
            >
              <IconRect />
            </button>
          </div>
          <LangSwitch />
          <span className="user-badge">
            <span className="avatar">{initial}</span>
            {me}
          </span>
          <button
            type="button"
            className="icon-btn has-tip dock-comments"
            aria-label={t("comments")}
            data-tip={t("comments")}
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
