import { CSSProperties, RefObject, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconClose, IconGrip, IconRectBox, IconSend } from "../icons";
import type { PendingAnchor, PinSpecs, ViewportBox } from "../types";

type Origin = { x: number; y: number; w: number; h: number };

function useFrameOrigin(frameRef: RefObject<HTMLElement | null>, active: boolean) {
  const [origin, setOrigin] = useState<Origin>({ x: 0, y: 0, w: 0, h: 0 });

  useLayoutEffect(() => {
    if (!active) return;
    const frame = frameRef.current;
    if (!frame) return;
    const iframe = frame.querySelector("iframe") ?? frame;
    const sync = () => {
      const rect = iframe.getBoundingClientRect();
      setOrigin({ x: rect.left, y: rect.top, w: rect.width, h: rect.height });
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(frame);
    const stage = frame.closest(".stage");
    stage?.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    window.addEventListener("scroll", sync, true);
    return () => {
      observer.disconnect();
      stage?.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
      window.removeEventListener("scroll", sync, true);
    };
  }, [frameRef, active]);

  return origin;
}

function clampToViewport(left: number, top: number, width: number, height: number) {
  const maxLeft = Math.max(8, window.innerWidth - width - 8);
  const maxTop = Math.max(8, window.innerHeight - height - 8);
  return {
    left: Math.min(Math.max(8, left), maxLeft),
    top: Math.min(Math.max(8, top), maxTop),
  };
}

function placePopover(box: ViewportBox, origin: Origin, size: { w: number; h: number }) {
  const popW = size.w || Math.min(300, window.innerWidth - 16);
  const popH = size.h || 280;
  const anchorLeft = origin.x + box.x;
  const anchorRight = origin.x + box.x + box.w;
  const anchorTop = origin.y + box.y;
  let left = anchorRight + 12;
  if (left + popW > window.innerWidth - 8) left = anchorLeft - popW - 12;
  let top = anchorTop - 8;
  return clampToViewport(left, top, popW, popH);
}

function placeNoteBar(box: ViewportBox, origin: Origin, size: { w: number; h: number }): CSSProperties {
  const barW = size.w || 360;
  const barH = size.h || 44;
  const right = origin.x + box.x + box.w + 8;
  const leftSide = origin.x + box.x - 8;
  const top = origin.y + box.y + box.h / 2;
  const roomRight = right + barW < window.innerWidth - 8;
  if (roomRight) {
    const pos = clampToViewport(right, top - barH / 2, barW, barH);
    return { left: pos.left, top: pos.top };
  }
  const pos = clampToViewport(leftSide - barW, top - barH / 2, barW, barH);
  return { left: pos.left, top: pos.top };
}

function Swatch({ value }: { value: string }) {
  if (!value || value === "transparent") {
    return <span className="swatch" aria-hidden="true" />;
  }
  return <span className="swatch" style={{ background: value }} aria-hidden="true" />;
}

function PinSpecsList({ specs }: { specs?: PinSpecs }) {
  if (!specs) return null;
  return (
    <ul className="pin-specs">
      <li>
        <span className="spec-k">Size</span>
        <span className="spec-v num">{specs.size}</span>
      </li>
      <li>
        <span className="spec-k">Color</span>
        <span className="spec-v">
          <Swatch value={specs.color} />
          <span className="num">{specs.color}</span>
        </span>
      </li>
      <li>
        <span className="spec-k">Bg</span>
        <span className="spec-v">
          <Swatch value={specs.bg} />
          <span className="num">{specs.bg}</span>
        </span>
      </li>
      <li>
        <span className="spec-k">Font</span>
        <span className="spec-v">{specs.font}</span>
      </li>
      <li>
        <span className="spec-k">Line</span>
        <span className="spec-v num">{specs.line}</span>
      </li>
    </ul>
  );
}

function PinPopover({
  pending,
  origin,
  onSubmit,
}: {
  pending: Extract<PendingAnchor, { kind: "element" }>;
  origin: Origin;
  onSubmit: (body: string) => void;
}) {
  const [text, setText] = useState("");
  const [size, setSize] = useState({ w: 300, h: 280 });
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const box = pending.box ?? { x: 24, y: 24, w: 0, h: 0 };
  const pos = placePopover(box, origin, size);

  useEffect(() => {
    setText("");
    inputRef.current?.focus();
  }, [pending.selector, pending.box?.x, pending.box?.y]);

  useLayoutEffect(() => {
    const el = popRef.current;
    if (!el) return;
    const sync = () => setSize({ w: el.offsetWidth, h: el.offsetHeight });
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => observer.disconnect();
  }, [pending.selector, pending.specs]);

  const canSend = Boolean(text.trim());

  return createPortal(
    <div
      ref={popRef}
      className="pin-popover"
      data-open="true"
      role="dialog"
      aria-label="Комментарий к элементу"
      style={{ left: pos.left, top: pos.top }}
    >
      <div className="pin-popover-head">
        <span className="pin-popover-drag" aria-hidden="true">
          <IconGrip />
        </span>
        <p className="pin-popover-sel">{pending.selector || "элемент"}</p>
      </div>
      <PinSpecsList specs={pending.specs} />
      <div className="pin-popover-divider" aria-hidden="true" />
      <textarea
        ref={inputRef}
        className="textarea"
        placeholder="Комментарий к элементу…"
        aria-label="Комментарий к элементу"
        value={text}
        onChange={(event) => setText(event.currentTarget.value)}
      />
      <div className="pin-popover-actions">
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={!canSend}
          onClick={() => {
            if (!canSend) return;
            onSubmit(text.trim());
          }}
        >
          Комментарий
        </button>
      </div>
    </div>,
    document.body,
  );
}

function RectNoteBar({
  pending,
  origin,
  onSubmit,
  onClose,
}: {
  pending: Extract<PendingAnchor, { kind: "rect" }>;
  origin: Origin;
  onSubmit: (body: string) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [size, setSize] = useState({ w: 360, h: 44 });
  const inputRef = useRef<HTMLInputElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const box = pending.box ?? { x: 24, y: 24, w: 80, h: 40 };

  useEffect(() => {
    setText("");
    inputRef.current?.focus();
  }, [pending.box?.x, pending.box?.y, pending.box?.w, pending.box?.h]);

  useLayoutEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const sync = () => setSize({ w: el.offsetWidth, h: el.offsetHeight });
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => observer.disconnect();
  }, [pending.box?.x, pending.box?.w]);

  const canSend = Boolean(text.trim());

  return createPortal(
    <div
      ref={barRef}
      className="rect-note-bar"
      data-open="true"
      role="group"
      aria-label="Заметка к выделению"
      style={placeNoteBar(box, origin, size)}
    >
      <div className="icon-seg" role="group" aria-label="Тип метки">
        <button type="button" className="has-tip" aria-pressed="true" aria-label="Прямоугольник" data-tip="Прямоугольник">
          <IconRectBox />
        </button>
      </div>
      <input
        ref={inputRef}
        className="rect-note-input"
        type="text"
        placeholder="Заметка к выделению…"
        aria-label="Заметка к выделению"
        value={text}
        onChange={(event) => setText(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && canSend) onSubmit(text.trim());
        }}
      />
      <button
        type="button"
        className="icon-btn send has-tip"
        aria-label="Отправить"
        data-tip="Отправить"
        disabled={!canSend}
        onClick={() => {
          if (!canSend) return;
          onSubmit(text.trim());
        }}
      >
        <IconSend />
      </button>
      <button
        type="button"
        className="icon-btn has-tip"
        aria-label="Закрыть"
        data-tip="Закрыть"
        onClick={onClose}
      >
        <IconClose />
      </button>
    </div>,
    document.body,
  );
}

export function AnchorDrafts({
  pending,
  frameRef,
  onSubmit,
  onCancelRect,
}: {
  pending: PendingAnchor | null;
  frameRef: RefObject<HTMLElement | null>;
  onSubmit: (body: string) => void;
  onCancelRect: () => void;
}) {
  const origin = useFrameOrigin(frameRef, Boolean(pending));
  if (!pending) return null;
  const box = pending.box;
  return (
    <>
      {pending.kind === "element" && box ? (
        <span
          className="pin-marker active"
          style={{ left: box.x + box.w / 2, top: box.y + box.h / 2 }}
          title="Элемент"
        />
      ) : null}
      {pending.kind === "rect" && box ? (
        <div
          className="rect-overlay draft"
          style={{ left: box.x, top: box.y, width: box.w, height: box.h }}
        />
      ) : null}
      {pending.kind === "element" ? (
        <PinPopover pending={pending} origin={origin} onSubmit={onSubmit} />
      ) : (
        <RectNoteBar pending={pending} origin={origin} onSubmit={onSubmit} onClose={onCancelRect} />
      )}
    </>
  );
}
