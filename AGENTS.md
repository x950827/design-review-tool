# AGENTS.md

Self-hosted HTML design review. React is chrome only. The thing being reviewed is HTML from a project git checkout, shown in an iframe with an injected `src/bridge.js`.

Read [docs/usage.md](docs/usage.md) before changing this repo or applying review feedback.

## Applying review comments

Feedback lives on the running instance, not in this git tree. Download `GET /admin/api/projects/:id/export.json` (or the admin **Export JSON** button). Work through `status: "open"` threads.

| `kind` | Meaning |
| --- | --- |
| `element` | CSS `selector` and optional `review_id` (`data-review-id`, else OpenDesign `data-od-id`) |
| `rect` | Normalized document box `rect_x/y/w/h` (0–1). Inspect at `viewport` 390 / 768 / 1440 |
| `page` | Unanchored note; no selector |

Fix the **design git** (variant folders), not `web/`. Then the human hits **Sync git** and checks the new SHA. Open threads persist across commits; a missing selector shows «Элемент не найден на этой версии».

## Changing this portal

- Chrome: `web/src/` + `web/src/styles.css`. Rebuild with `npm run build:web`. Restart the server after editing `src/bridge.js` or `src/pin-target.js`.
- Pin popover and rect note bar: `web/src/review/AnchorDrafts.tsx`, portaled to `document.body` so the iframe clip does not crop them. Do not move that composer back into the comments panel.
- Do not rewrite preview HTML as React. Do not invent comment kinds. `page` already exists.
- Do not change auth, cookie paths, SQLite schema, or preview serving unless the task is explicitly that.
- Chrome copy is English by default and Russian through the EN | RU switch. Technical labels stay Resolve, SHA, and Sync git.
