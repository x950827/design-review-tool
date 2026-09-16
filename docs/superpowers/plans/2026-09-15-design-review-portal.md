# Design Review Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Self-hosted review portal: named reviewer login, live HTML from private git, A/B + 390/768/1440 + commit history, pin/rect threads, admin CRUD, JSON export.

**Architecture:** One Node/TS Hono process. SQLite for projects/reviewers/comments. System `git` for fetch/log/checkout. React Vite chrome only; catalog HTML served in a sandboxed iframe with an injected bridge. Cookies: reviewer `Path=/p/<slug>`, admin `Path=/admin`.

**Tech Stack:** Node 22+, TypeScript, Hono, better-sqlite3, bcryptjs, Vitest, Vite, React 19.

**Spec:** `docs/superpowers/specs/2026-09-15-design-review-portal-design.md`

## File map

- `src/config.ts` — env: bind host/port, admin password, session secret, data dir, default SSH key
- `src/db.ts` — open SQLite, migrations
- `src/auth.ts` — hash/verify, signed cookies, rate limit helpers
- `src/git.ts` — clone/fetch, log by paths, checkout SHA into data/checkouts
- `src/preview.ts` — safe join, inject bridge into HTML, deny traversal
- `src/comments.ts` — list/create/reply/resolve
- `src/projects.ts` — admin CRUD projects, variants, reviewers, sync, export
- `src/app.ts` — Hono routes
- `src/index.ts` — listen
- `src/bridge.js` — postMessage pin/rect from iframe
- `web/` — React login, chrome, comment panel
- `tests/` — vitest against real SQLite temp dirs and local git fixtures
- `fixtures/site/` — tiny HTML + `assets/pixel.png` for tests

### Task 1: Scaffold + SQLite schema

**Files:** `package.json`, `tsconfig.json`, `src/db.ts`, `tests/db.test.ts`, `src/config.ts`

- [ ] Init npm, add dependencies: `hono`, `@hono/node-server`, `better-sqlite3`, `bcryptjs`, `tsx`, `typescript`, `vitest`, `@types/better-sqlite3`, `@types/bcryptjs`, `@types/node`
- [ ] `openDb(path)` creates tables: projects, variants, reviewers, comments, replies
- [ ] Test: opening a temp db then inserting a project succeeds; second open keeps the row
- [ ] Commit

### Task 2: Admin session + reviewer credentials

**Files:** `src/auth.ts`, `tests/auth.test.ts`

- [ ] `hashPassword` / `verifyPassword`
- [ ] `createReviewer(db, projectId, name, password)` unique name per project
- [ ] `loginReviewer(db, slug, name, password)` → session token or null; disabled reviewers fail
- [ ] `loginAdmin(password)` against config
- [ ] Signed cookie payload `{ kind, reviewerId?, projectId?, exp }`
- [ ] Commit

### Task 3: Project CRUD

**Files:** `src/projects.ts`, `tests/projects.test.ts`

- [ ] create project with slug, gitUrl, branch, variants[]
- [ ] add/disable/reset reviewer
- [ ] isolation: reviewer of A cannot load B
- [ ] Commit

### Task 4: Git sync, history, checkout

**Files:** `src/git.ts`, `tests/git.test.ts`, local bare repo fixture created in the test

- [ ] `sync(project)` fetch/clone
- [ ] `history(project)` log for union of variant paths
- [ ] `checkout(project, sha)` materializes files under `data/checkouts/<projectId>/<sha>/`
- [ ] missing path at SHA → explicit error, no throw through HTTP 500 without message
- [ ] Commit

### Task 5: Preview file server

**Files:** `src/preview.ts`, `tests/preview.test.ts`, `src/bridge.js`

- [ ] serve `index.html` with injected bridge
- [ ] `./assets/pixel.png` returns 200
- [ ] `../.env` and absolute paths return 403
- [ ] HTML routes require reviewer session
- [ ] Commit

### Task 6: Comments API

**Files:** `src/comments.ts`, `tests/comments.test.ts`

- [ ] create element/rect/page comment with variant, sha, viewport, author
- [ ] replies; resolve/reopen on root
- [ ] default list: all open for current variant across SHAs
- [ ] export JSON for admin
- [ ] Commit

### Task 7: Hono app

**Files:** `src/app.ts`, `src/index.ts`, `tests/app.test.ts`

- [ ] `POST /admin/login`, `/admin/projects`, `/admin/projects/:id/reviewers`, `/admin/projects/:id/sync`, `/admin/projects/:id/export.json`
- [ ] `POST /p/:slug/login`, `GET/POST /p/:slug/comments`, replies, resolve
- [ ] `GET /p/:slug/files/:sha/:variant/*` preview
- [ ] login rate limit 401 generic
- [ ] Commit

### Task 8: React chrome

**Files:** `web/` Vite React app served by Hono from `web/dist` (dev: Vite middleware or `vite` + proxy)

- [ ] login form name+password
- [ ] A/B, 390/768/1440, SHA select, iframe, thread list, pin/rect via postMessage
- [ ] admin pages: projects, reviewers, sync, export
- [ ] Browser-verify locally
- [ ] Commit

### Task 9: SourceCraft remote + README

- [ ] `src repo create organization-x950827 --slug design-review-tool --visibility private`
- [ ] README: env, `npm test`, `npm run dev`, VDS bind, SSH key, one-port HTTP
- [ ] Push `main`
