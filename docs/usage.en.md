# How to use Design Review

[Русский](usage.md)

A portal for reviewing live HTML from git. An admin adds a project, a reviewer opens a link, compares variants at 390 / 768 / 1440, and leaves threads. The design stays HTML in an iframe. React is only the frame: login, dock, comment panel.

This is for people who review, and for agents that read the feedback and edit the design.

## Run

```bash
cp .env.example .env
# ADMIN_PASSWORD and SESSION_SECRET (at least 16 characters)
npm install
npm test
npm run build:web
npm run dev
```

Open `http://127.0.0.1:8787/admin`. On a server, see [deploy.md](deploy.md). Without HTTPS the password travels in the clear.

After `web/` changes, run `npm run build:web` again. `bridge.js` and `pin-target.js` are read when the process starts, so restart after editing them.

## Try the sample

This repository includes a two-variant shop page. In `/admin`, create a project:

| Field | Value |
| --- | --- |
| Git URL | `https://github.com/x950827/design-review-tool.git` |
| Branch | `main` |
| Variant A | `examples/catalog/a` |
| Variant B | `examples/catalog/b` |

Press **Sync git**, then open `/p/<slug>`. Cards carry `data-od-id`, so a click on a price or button attaches to the card.

## For people

### Admin

`/admin`, password from `ADMIN_PASSWORD`.

1. Create a project: title, slug, git URL, branch, and the variant folder paths inside the repo. Each folder needs an `index.html`.
2. Press **Sync git**. Commit history for those paths is fetched.
3. Add named reviewer accounts (name + password). There is no public signup.
4. Send the client `/p/<slug>`. The **Админ** account is created automatically and uses the admin password.

**Export JSON** on the project card is every thread, reply, selector, rect, SHA, and viewport. That file is the input for an agent.

### Review

Sign in with the account name and password. One window after that.

The dock along the bottom:

- variant A / B;
- width 390 / 768 / 1440;
- commit;
- mode: **Просмотр** (browse), **Элемент** (element), **Выделить** (highlight).

The right panel lists open comments for the current variant, across all SHAs. Resolved threads leave the list.

Three ways to comment:

1. **Element.** Click a block in the preview. A card appears by the pin: selector, Size / Color / Bg / Font / Line, text, and **Комментарий**. The card is drawn over the iframe and can extend past its edge.
2. **Highlight.** Drag a rectangle. A note bar appears beside it. The close control returns to browse.
3. **+** in the panel header. A comment with no element and no rectangle (`kind: page`).

Replies are written on the thread card. **Resolve** closes the root. Clicking a thread highlights its anchor in the preview. If the selector is gone on this version, the panel says «Элемент не найден на этой версии».

Do not look for a pin composer in the right panel. That panel is the list, replies, and the unanchored note from +.

## For agents

### Which repository to edit

| What | Where | Edit it? |
| --- | --- | --- |
| The portal frame | this repo, `web/`, `src/` | only when fixing the portal itself |
| The design under review | the project's git (variant folders) | yes, when applying review comments |
| Comments | SQLite on the instance | no, only read the export |

Do not rewrite the catalog or landing page as React in this repo. The preview is HTML, CSS, JS, and images from the checkout. `src/bridge.js` is injected on the fly. Files in the design git are not modified by the portal.

### Fetch the feedback

From the instance, with an admin session:

```
GET /admin/api/projects/:id/export.json
```

Or the **Экспорт JSON** button in `/admin`. The body is `{ comments, replies }`. Fields an agent needs:

- `body`, `author_name`, `status` (`open` / `resolved`)
- `kind`: `element` | `rect` | `page`
- `selector` — a CSS path, `[data-review-id="…"]`, or `[data-od-id="…"]` (OpenDesign)
- `review_id` — the `data-review-id` value, otherwise `data-od-id` when a stable anchor was found
- `rect_x/y/w/h` — fractions of the **document** size (0–1), not viewport pixels
- `viewport` — 390, 768, or 1440; look at the bug at that width
- `variant_key` — which folder (`a` / `b`)
- `commit_sha` — the version the note was left on; open threads survive newer SHAs

Take the **open** threads. Resolved ones are context, not a to-do.

### Fixing by kind

**element.** Find the node with `selector`. If the selector is fragile (`nth-of-type`, a long chain), add a stable `data-od-id` or `data-review-id` on the design and keep it. A click on a nested price, rating, or button attaches to the nearest card that has an anchor, not to `nth-of-type`. Specs shown in the UI (font, color, size) are a hint from the click. They are not in the export.

**rect.** A region of the frame, not an element. Use that `viewport` and that variant, and change what fell inside the box. Coordinates are normalized to scrollWidth / scrollHeight.

**page.** A note about the whole page: tone, grid, the overall feel. There is no anchor.

Join `replies` to the parent by `comment_id`.

### How to check

After the edit: commit in the design repo, press **Sync git** in the portal admin, then in review select the new SHA and the same variant and viewport as the comment. Open threads remain. If the selector still matches, clicking the thread highlights the block.

A screenshot of the frame is not enough. Open `/p/<slug>` and walk the path: pin, highlight, unanchored comment, width change, second variant.

### If you are changing the portal

- Chrome: `web/src/` (login, admin, dock, panel, overlays). Styles: `web/src/styles.css`.
- The pin card and the highlight bar live in `web/src/review/AnchorDrafts.tsx`. They portal to `document.body` so the iframe `overflow` does not clip them.
- Clicks in the design: `src/bridge.js` and `src/pin-target.js` (`postMessage`: `pin` / `rect` / `focus-anchor` / `set-mode`). The anchor is `closest("[data-review-id], [data-od-id]")`. The found id is sent as `reviewId`.
- API and git: `src/app.ts`, `src/comments.ts`, `src/git.ts`. Kind `page` already exists. Do not invent another.
- Do not move the pin or rect composer back into the right panel.
- Do not change auth, cookie paths, the SQLite schema, or preview serving unless the task says so. `COOKIE_SECURE` is `false` locally and `true` in production.
- Interface copy is Russian, except technical labels such as Resolve and SHA.

Where the live UI differs from the original spec (overlays instead of a composer in the panel), trust the current code and this document.
