// Pin target helpers. Inlined into the iframe bridge at process start (see loadBridgeSource).
export function cssEscape(value) {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value);
  }
  return String(value).replace(/[^\w-]/g, (ch) => `\\${ch}`);
}

export function cssPath(el) {
  if (el.id) return `#${cssEscape(el.id)}`;
  const parts = [];
  let node = el;
  while (node && node.nodeType === 1 && parts.length < 6) {
    let sel = node.nodeName.toLowerCase();
    if (node.className && typeof node.className === "string") {
      const cls = node.className.trim().split(/\s+/)[0];
      if (cls) sel += `.${cssEscape(cls)}`;
    }
    const parent = node.parentElement;
    if (parent) {
      const siblings = [...parent.children].filter((child) => child.nodeName === node.nodeName);
      if (siblings.length > 1) sel += `:nth-of-type(${siblings.indexOf(node) + 1})`;
    }
    parts.unshift(sel);
    node = parent;
  }
  return parts.join(" > ");
}

export function attrSelector(attr, value) {
  return `[${attr}="${cssEscape(value)}"]`;
}

export function resolvePinTarget(el) {
  const anchor = typeof el.closest === "function" ? el.closest("[data-review-id], [data-od-id]") : null;
  if (anchor) {
    const reviewId = anchor.getAttribute("data-review-id");
    if (reviewId) {
      return {
        selector: attrSelector("data-review-id", reviewId),
        reviewId,
        node: anchor,
      };
    }
    const odId = anchor.getAttribute("data-od-id");
    if (odId) {
      return {
        selector: attrSelector("data-od-id", odId),
        reviewId: odId,
        node: anchor,
      };
    }
  }
  return {
    selector: cssPath(el),
    reviewId: null,
    node: el,
  };
}
