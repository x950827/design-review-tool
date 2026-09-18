(() => {
  const parentOrigin = document.referrer ? new URL(document.referrer).origin : "*";
  const targetOrigin = parentOrigin === "null" ? "*" : parentOrigin;

  function cssPath(el) {
    if (el.dataset && el.dataset.reviewId) return `[data-review-id="${el.dataset.reviewId}"]`;
    if (el.id) return `#${CSS.escape(el.id)}`;
    const parts = [];
    let node = el;
    while (node && node.nodeType === 1 && parts.length < 6) {
      let sel = node.nodeName.toLowerCase();
      if (node.className && typeof node.className === "string") {
        const cls = node.className.trim().split(/\s+/)[0];
        if (cls) sel += `.${CSS.escape(cls)}`;
      }
      const parent = node.parentElement;
      if (parent) {
        const siblings = [...parent.children].filter((c) => c.nodeName === node.nodeName);
        if (siblings.length > 1) sel += `:nth-of-type(${siblings.indexOf(node) + 1})`;
      }
      parts.unshift(sel);
      node = parent;
    }
    return parts.join(" > ");
  }

  function ensureUi() {
    if (!document.getElementById("dr-style")) {
      const style = document.createElement("style");
      style.id = "dr-style";
      style.textContent = `
        #dr-highlight, #dr-rect {
          position: absolute;
          pointer-events: none;
          z-index: 2147483646;
          box-sizing: border-box;
        }
        #dr-highlight {
          outline: 2px solid #1d1d1f;
          box-shadow: 0 0 0 1px #fff;
        }
        #dr-rect {
          outline: 2px dashed #dc2626;
          background: rgba(220, 38, 38, 0.12);
        }
        html.dr-mode-comment, html.dr-mode-rect,
        html.dr-mode-comment *, html.dr-mode-rect * { cursor: crosshair !important; }
      `;
      document.documentElement.appendChild(style);
    }
    let highlight = document.getElementById("dr-highlight");
    if (!highlight) {
      highlight = document.createElement("div");
      highlight.id = "dr-highlight";
      highlight.style.display = "none";
      document.documentElement.appendChild(highlight);
    }
    let rectEl = document.getElementById("dr-rect");
    if (!rectEl) {
      rectEl = document.createElement("div");
      rectEl.id = "dr-rect";
      rectEl.style.display = "none";
      document.documentElement.appendChild(rectEl);
    }
    return { highlight, rectEl };
  }

  function place(el, x, y, w, h) {
    el.style.display = w < 1 || h < 1 ? "none" : "block";
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.width = `${w}px`;
    el.style.height = `${h}px`;
  }

  function coverElement(overlay, node) {
    const box = node.getBoundingClientRect();
    place(
      overlay,
      box.left + window.scrollX,
      box.top + window.scrollY,
      box.width,
      box.height,
    );
  }

  let mode = "browse";
  let drawing = null;
  let drafting = false;

  function setMode(next) {
    mode = next;
    drafting = false;
    const { highlight, rectEl } = ensureUi();
    document.documentElement.classList.toggle("dr-mode-comment", mode === "comment");
    document.documentElement.classList.toggle("dr-mode-rect", mode === "rect");
    if (mode !== "comment") highlight.style.display = "none";
    if (mode !== "rect") {
      drawing = null;
      rectEl.style.display = "none";
    }
  }

  function toHex(color) {
    const value = String(color || "");
    const match = value.match(
      /rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)(?:[\s,/]+([\d.]+%?))?\s*\)/i,
    );
    if (!match) return value;
    const alpha = match[4] == null ? 1 : match[4].endsWith("%")
      ? Number.parseFloat(match[4]) / 100
      : Number.parseFloat(match[4]);
    if (alpha === 0) return "transparent";
    return `#${[match[1], match[2], match[3]]
      .map((part) => Number(part).toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()}`;
  }

  function viewportBox(node) {
    const box = node.getBoundingClientRect();
    return { x: box.left, y: box.top, w: box.width, h: box.height };
  }

  function collectSpecs(el) {
    const cs = window.getComputedStyle(el);
    const box = el.getBoundingClientRect();
    const fontFamily = (cs.fontFamily || "").split(",")[0].replace(/['"]/g, "").trim();
    const fontSize = cs.fontSize;
    const lineHeight = cs.lineHeight;
    const line =
      lineHeight === "normal" || !lineHeight
        ? fontSize
        : `${Math.round(Number.parseFloat(lineHeight) * 100) / 100}px`;
    return {
      size: `${Math.round(box.width)}×${Math.round(box.height)}`,
      color: toHex(cs.color),
      bg: toHex(cs.backgroundColor),
      font: `${Number.parseFloat(fontSize)}px ${cs.fontWeight} ${fontFamily}`.trim(),
      line,
    };
  }

  function focusAnchor(payload) {
    const { highlight, rectEl } = ensureUi();
    if (payload.kind === "element" && payload.selector) {
      let el = null;
      try {
        el = document.querySelector(payload.selector);
      } catch {
        el = null;
      }
      rectEl.style.display = "none";
      if (!el) {
        highlight.style.display = "none";
        window.parent.postMessage(
          { source: "design-review-bridge", type: "focus-result", ok: false },
          targetOrigin,
        );
        return;
      }
      el.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
      coverElement(highlight, el);
      window.parent.postMessage(
        { source: "design-review-bridge", type: "focus-result", ok: true },
        targetOrigin,
      );
      return;
    }
    if (payload.kind === "rect" && payload.rect) {
      highlight.style.display = "none";
      const docW = Math.max(document.documentElement.scrollWidth, 1);
      const docH = Math.max(document.documentElement.scrollHeight, 1);
      const x = payload.rect.x * docW;
      const y = payload.rect.y * docH;
      const w = payload.rect.w * docW;
      const h = payload.rect.h * docH;
      place(rectEl, x, y, w, h);
      window.scrollTo({ top: Math.max(0, y - 72), left: Math.max(0, x - 24), behavior: "smooth" });
      window.parent.postMessage(
        { source: "design-review-bridge", type: "focus-result", ok: true },
        targetOrigin,
      );
      return;
    }
    window.parent.postMessage(
      { source: "design-review-bridge", type: "focus-result", ok: false },
      targetOrigin,
    );
  }

  window.addEventListener("message", (event) => {
    if (!event.data || event.data.source !== "design-review") return;
    if (event.data.type === "set-mode") setMode(event.data.mode);
    if (event.data.type === "focus-anchor") focusAnchor(event.data);
  });

  document.addEventListener(
    "mousemove",
    (event) => {
      const { highlight, rectEl } = ensureUi();
      if (mode === "comment") {
        if (drafting) return;
        const el = event.target;
        if (el instanceof Element && el.id !== "dr-highlight" && el.id !== "dr-rect") {
          coverElement(highlight, el);
        }
        return;
      }
      if (mode === "rect" && drawing) {
        const x = Math.min(drawing.x, event.pageX);
        const y = Math.min(drawing.y, event.pageY);
        place(rectEl, x, y, Math.abs(event.pageX - drawing.x), Math.abs(event.pageY - drawing.y));
      }
    },
    true,
  );

  document.addEventListener(
    "click",
    (event) => {
      if (mode !== "comment") return;
      event.preventDefault();
      event.stopPropagation();
      const el = event.target;
      if (!(el instanceof Element) || el.id === "dr-highlight") return;
      const { highlight } = ensureUi();
      coverElement(highlight, el);
      drafting = true;
      highlight.style.display = "none";
      window.parent.postMessage(
        {
          source: "design-review-bridge",
          type: "pin",
          selector: cssPath(el),
          reviewId: el.getAttribute("data-review-id"),
          text: (el.textContent || "").trim().slice(0, 120),
          box: viewportBox(el),
          specs: collectSpecs(el),
        },
        targetOrigin,
      );
    },
    true,
  );

  document.addEventListener(
    "mousedown",
    (event) => {
      if (mode !== "rect" || event.button !== 0) return;
      event.preventDefault();
      drawing = { x: event.pageX, y: event.pageY };
      const { rectEl } = ensureUi();
      place(rectEl, drawing.x, drawing.y, 0, 0);
    },
    true,
  );

  document.addEventListener(
    "mouseup",
    (event) => {
      if (!drawing) return;
      const start = drawing;
      drawing = null;
      const w = Math.abs(event.pageX - start.x);
      const h = Math.abs(event.pageY - start.y);
      const { rectEl } = ensureUi();
      if (w < 8 || h < 8) {
        rectEl.style.display = "none";
        return;
      }
      const x = Math.min(start.x, event.pageX);
      const y = Math.min(start.y, event.pageY);
      place(rectEl, x, y, w, h);
      const docW = Math.max(document.documentElement.scrollWidth, 1);
      const docH = Math.max(document.documentElement.scrollHeight, 1);
      window.parent.postMessage(
        {
          source: "design-review-bridge",
          type: "rect",
          rect: { x: x / docW, y: y / docH, w: w / docW, h: h / docH },
          box: viewportBox(rectEl),
        },
        targetOrigin,
      );
    },
    true,
  );
})();
