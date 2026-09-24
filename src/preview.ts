import fs from "node:fs";
import path from "node:path";

export function resolvePreviewFile(root: string, requestPath: string): string | null {
  const relative = requestPath.replace(/^\/+/, "") || "index.html";
  if (relative.split("/").some((part) => part === "..")) return null;
  const resolved = path.resolve(root, relative);
  const rootResolved = path.resolve(root);
  if (resolved !== rootResolved && !resolved.startsWith(rootResolved + path.sep)) {
    return null;
  }
  let realRoot: string;
  let realFile: string;
  try {
    realRoot = fs.realpathSync(rootResolved);
    realFile = fs.realpathSync(resolved);
  } catch {
    return null;
  }
  if (realFile !== realRoot && !realFile.startsWith(realRoot + path.sep)) return null;
  if (!fs.statSync(realFile).isFile()) return null;
  return realFile;
}

export function injectBridge(html: string, bridgeSrc: string): string {
  const tag = `<script src="${bridgeSrc}"></script>`;
  if (html.includes(tag)) return html;
  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${tag}</body>`);
  }
  return `${html}\n${tag}`;
}

export function mimeType(file: string): string {
  const ext = path.extname(file).toLowerCase();
  switch (ext) {
    case ".html":
    case ".htm":
      return "text/html; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".woff2":
      return "font/woff2";
    case ".woff":
      return "font/woff";
    case ".ttf":
      return "font/ttf";
    default:
      return "application/octet-stream";
  }
}
