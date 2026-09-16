(() => {
  const parentOrigin = document.referrer ? new URL(document.referrer).origin : "*";

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

  let mode = "browse";
  let drawing = null;

  window.addEventListener("message", (event) => {
    if (!event.data || event.data.source !== "design-review") return;
    if (event.data.type === "set-mode") mode = event.data.mode;
  });

  document.addEventListener(
    "click",
    (event) => {
      if (mode !== "comment") return;
      event.preventDefault();
      event.stopPropagation();
      const el = event.target;
      if (!(el instanceof Element)) return;
      window.parent.postMessage(
        {
          source: "design-review-bridge",
          type: "pin",
          selector: cssPath(el),
          reviewId: el.getAttribute("data-review-id"),
          text: (el.textContent || "").trim().slice(0, 120),
        },
        parentOrigin === "null" ? "*" : parentOrigin,
      );
    },
    true,
  );

  document.addEventListener("mousedown", (event) => {
    if (mode !== "rect" || event.button !== 0) return;
    event.preventDefault();
    drawing = { x: event.pageX, y: event.pageY };
  });

  document.addEventListener("mouseup", (event) => {
    if (!drawing) return;
    const w = event.pageX - drawing.x;
    const h = event.pageY - drawing.y;
    const start = drawing;
    drawing = null;
    if (Math.abs(w) < 8 || Math.abs(h) < 8) return;
    const docW = Math.max(document.documentElement.scrollWidth, 1);
    const docH = Math.max(document.documentElement.scrollHeight, 1);
    const x = Math.min(start.x, event.pageX);
    const y = Math.min(start.y, event.pageY);
    window.parent.postMessage(
      {
        source: "design-review-bridge",
        type: "rect",
        rect: {
          x: x / docW,
          y: y / docH,
          w: Math.abs(w) / docW,
          h: Math.abs(h) / docH,
        },
      },
      parentOrigin === "null" ? "*" : parentOrigin,
    );
  });
})();
