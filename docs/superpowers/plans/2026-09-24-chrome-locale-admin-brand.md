# Chrome locale, admin, and Focus Frame Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** English-default chrome with a Russian dictionary, reviewer login `admin`, admin actions on the existing API, and the Focus Frame palette.

**Architecture:** Pure `resolveLocale` plus two typed message objects in the React chrome. SQLite rows named `Админ` are renamed to `admin` when that name is free. The projects list gains `open_count`. Disable accepts `{ disabled: boolean }`. Inter is self-hosted.

**Tech Stack:** Node 22, Hono, better-sqlite3, React 19, Vite, Vitest.

## Global Constraints

- English keys are the type. The Russian object must cover the same keys or the build fails.
- Resolution: `localStorage` key `dr-locale` when `en` or `ru`, else `ru` when the first `navigator.languages` entry starts with `ru`, else `en`.
- EN | RU sits in the review dock and the admin header. On the phone review shell it sits in the comments panel header. The dock rule that hides `.lang-seg` at that width stays.
- Translated: labels, buttons, empty states, tooltips, aria-labels, and known API errors `invalid credentials`, `name and password required`, `password required`, `name required`, `too many attempts`, `sync failed`, `failed`, `not found`, `unauthorized`.
- Left as returned: comment and reply bodies, commit subjects, reviewer names, git URLs, slugs, variant labels stored in the database.
- `ADMIN_REVIEWER_NAME` is `"admin"`. On `openDb`, rename `Админ` to `admin` per project only when `admin` is absent. Both names: leave `Админ`. Do not change the SQLite schema.
- The built-in `admin` row has no Disable and no Reset.
- Create form starts empty. Empty project list points at the form.
- Card shows copy of `{origin}/p/{slug}`, `open_count` for `status = 'open'`, sync commit count, and the translated sync error.
- Reset is an inline password field, then `POST .../reset` with `{ password }`.
- `POST .../disable` with a missing body still disables. `{ disabled: false }` calls `setReviewerDisabled(reviewerId, false)`.
- `:root` ink `#111318`, accent `#6E63FF`, accent on dark `#8C85FF`, surface `#F1F2F5`, page background `#F7F7FA`. Hover and active are mixes of `#6E63FF`, not `#0071e3`.
- Inter weights 400 and 600 live in `web/public/fonts/` via `@font-face`. No third-party font host at runtime.
- Dock layout, pin popover, and rect bar stay where they are. Existing logo and mark files stay.
- `AGENTS.md`: chrome copy is English by default, Russian through the switch. Resolve, SHA, and Sync git stay.
- `docs/usage.md` and `docs/usage.en.md`: automatic reviewer login is `admin`, same password as the admin password.
- Do not edit or delete projects. Do not translate comment bodies. Do not add i18next or a locale cookie.

---

### Task 1: Locale resolution

**Files:**
- Create: `web/src/locale.ts`
- Test: `tests/locale.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `export type Locale = "en" | "ru"` and `export function resolveLocale(saved: string | null, languages: readonly string[]): Locale`

- [ ] **Step 1: Write the failing test**

```ts
import { expect, test } from "vitest";
import { resolveLocale } from "../web/src/locale.ts";

test("saved en or ru wins over the browser list", () => {
  expect(resolveLocale("en", ["ru-RU", "en"])).toBe("en");
  expect(resolveLocale("ru", ["en-US"])).toBe("ru");
});

test("a Russian first browser language selects ru", () => {
  expect(resolveLocale(null, ["ru-RU", "en"])).toBe("ru");
  expect(resolveLocale("nope", ["ru"])).toBe("ru");
});

test("any other first browser language selects en", () => {
  expect(resolveLocale(null, ["en-US", "ru"])).toBe("en");
  expect(resolveLocale(null, [])).toBe("en");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/locale.test.ts`

Expected: FAIL with failed to resolve `../web/src/locale.ts`

- [ ] **Step 3: Write minimal implementation**

```ts
export type Locale = "en" | "ru";

export function resolveLocale(saved: string | null, languages: readonly string[]): Locale {
  if (saved === "en" || saved === "ru") return saved;
  const first = languages[0] ?? "";
  return first.toLowerCase().startsWith("ru") ? "ru" : "en";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/locale.test.ts`

Expected: PASS, 3 tests

- [ ] **Step 5: Commit**

```bash
git add web/src/locale.ts tests/locale.test.ts
git commit -m "feat: resolve chrome locale from storage or browser"
```

---

### Task 2: Reviewer login `admin`

**Files:**
- Modify: `src/projects.ts` (constant and new function)
- Modify: `src/db.ts` (`openDb` calls the rename)
- Modify: `tests/app.test.ts` (existing `Админ` assertions)
- Test: `tests/admin-name.test.ts`

**Interfaces:**
- Consumes: `openDb`, `createProject`, `createComment`, `listReviewers`
- Produces: `export const ADMIN_REVIEWER_NAME = "admin"` and `export function renameLegacyAdminReviewers(db: Database.Database): void`

- [ ] **Step 1: Write the failing test**

```ts
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, test } from "vitest";
import { createComment } from "../src/comments.ts";
import { openDb } from "../src/db.ts";
import { createProject, listReviewers, renameLegacyAdminReviewers } from "../src/projects.ts";

function tempDb() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dr-admin-name-"));
  return openDb(path.join(dir, "app.db"));
}

test("Админ is renamed to admin and the comment stays on that reviewer", () => {
  const db = tempDb();
  const project = createProject(db, {
    slug: "shop",
    title: "Shop",
    gitUrl: "/tmp/x",
    branch: "main",
    variants: [{ key: "a", label: "A", git_path: "variant-a" }],
  });
  const inserted = db
    .prepare(
      "INSERT INTO reviewers (project_id, name, password_hash, disabled, created_at) VALUES (?, 'Админ', 'hash', 0, ?)",
    )
    .run(project.id, new Date().toISOString());
  const reviewerId = Number(inserted.lastInsertRowid);
  createComment(db, {
    projectId: project.id,
    reviewerId,
    variantKey: "a",
    commitSha: "abc1234",
    viewport: 390,
    kind: "page",
    body: "tone",
  });
  renameLegacyAdminReviewers(db);
  expect(listReviewers(db, project.id).map((r) => r.name)).toEqual(["admin"]);
  const author = db
    .prepare(
      "SELECT r.name AS author_name FROM comments c JOIN reviewers r ON r.id = c.reviewer_id WHERE c.project_id = ?",
    )
    .get(project.id) as { author_name: string };
  expect(author.author_name).toBe("admin");
});

test("an existing admin row keeps a separate Админ row", () => {
  const db = tempDb();
  const project = createProject(db, {
    slug: "shop",
    title: "Shop",
    gitUrl: "/tmp/x",
    branch: "main",
    variants: [{ key: "a", label: "A", git_path: "variant-a" }],
  });
  const now = new Date().toISOString();
  const insert = db.prepare(
    "INSERT INTO reviewers (project_id, name, password_hash, disabled, created_at) VALUES (?, ?, 'hash', 0, ?)",
  );
  insert.run(project.id, "admin", now);
  insert.run(project.id, "Админ", now);
  renameLegacyAdminReviewers(db);
  expect(listReviewers(db, project.id).map((r) => r.name).sort()).toEqual(["admin", "Админ"]);
});
```

- [ ] **Step 2: Update the existing login assertion**

In `tests/app.test.ts`, replace the test name and the three `"Админ"` strings with `"admin"`.

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run tests/admin-name.test.ts tests/app.test.ts -t "admin"`

Expected: FAIL because `renameLegacyAdminReviewers` is not exported and the list still contains `Админ` from `ensureAdminReviewer`.

- [ ] **Step 4: Implement the rename**

In `src/projects.ts`, change the constant and add the function. Call it at the end of `openDb` after `db.exec(SCHEMA)`.

```ts
export const ADMIN_REVIEWER_NAME = "admin";

export function renameLegacyAdminReviewers(db: Database.Database): void {
  db.prepare(
    `UPDATE reviewers
     SET name = 'admin'
     WHERE name = 'Админ'
       AND NOT EXISTS (
         SELECT 1 FROM reviewers taken
         WHERE taken.project_id = reviewers.project_id AND taken.name = 'admin'
       )`,
  ).run();
}
```

```ts
import { renameLegacyAdminReviewers } from "./projects.ts";

export function openDb(dbPath: string): Database.Database {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  renameLegacyAdminReviewers(db);
  return db;
}
```

`src/projects.ts` must not import `src/db.ts`. `src/db.ts` may import `renameLegacyAdminReviewers` from `src/projects.ts`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/admin-name.test.ts tests/app.test.ts -t "admin"`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/projects.ts src/db.ts tests/admin-name.test.ts tests/app.test.ts
git commit -m "feat: rename the built-in reviewer login to admin"
```

---

### Task 3: Open count and disable flag

**Files:**
- Modify: `src/comments.ts` (add `countOpenComments`)
- Modify: `src/app.ts` (projects list and disable route)
- Modify: `web/src/types.ts` (`open_count` on `Project`)
- Test: `tests/app.test.ts`

**Interfaces:**
- Consumes: `setReviewerDisabled(db, reviewerId, disabled: boolean)`
- Produces: `export function countOpenComments(db: Database.Database, projectId: number): number`. Each project in `GET /admin/api/projects` includes `open_count: number`. `POST /admin/api/projects/:id/reviewers/:rid/disable` reads `{ disabled?: boolean }` and passes `body.disabled !== false` to `setReviewerDisabled`.

- [ ] **Step 1: Write the failing test**

Append to `tests/app.test.ts`:

```ts
test("project list includes open_count and disable can enable again", async () => {
  const { db, app } = setup();
  const adminLogin = await app.request("/admin/api/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password: "admin-secret" }),
  });
  const adminCookie = cookie(adminLogin, "dr_admin");
  const created = await app.request("/admin/api/projects", {
    method: "POST",
    headers: { "content-type": "application/json", cookie: adminCookie },
    body: JSON.stringify({
      slug: "shop",
      title: "Shop",
      gitUrl: "/tmp/x",
      branch: "main",
      variants: [{ key: "a", label: "A", git_path: "variant-a" }],
    }),
  });
  const projectId = ((await created.json()) as { project: { id: number } }).project.id;
  const added = await app.request(`/admin/api/projects/${projectId}/reviewers`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: adminCookie },
    body: JSON.stringify({ name: "Anna", password: "anna-pass" }),
  });
  const reviewerId = ((await added.json()) as { reviewer: { id: number } }).reviewer.id;
  const { createComment } = await import("../src/comments.ts");
  createComment(db, {
    projectId,
    reviewerId,
    variantKey: "a",
    commitSha: "abc1234",
    viewport: 1440,
    kind: "page",
    body: "open note",
  });
  const listed = await app.request("/admin/api/projects", { headers: { cookie: adminCookie } });
  const projects = ((await listed.json()) as { projects: { open_count: number }[] }).projects;
  expect(projects[0]?.open_count).toBe(1);

  const disabled = await app.request(
    `/admin/api/projects/${projectId}/reviewers/${reviewerId}/disable`,
    { method: "POST", headers: { cookie: adminCookie } },
  );
  expect(disabled.status).toBe(200);
  const enabled = await app.request(
    `/admin/api/projects/${projectId}/reviewers/${reviewerId}/disable`,
    {
      method: "POST",
      headers: { "content-type": "application/json", cookie: adminCookie },
      body: JSON.stringify({ disabled: false }),
    },
  );
  expect(enabled.status).toBe(200);
  const again = await app.request("/admin/api/projects", { headers: { cookie: adminCookie } });
  const reviewers = (
    (await again.json()) as { projects: { reviewers: { name: string; disabled: number }[] }[] }
  ).projects[0]?.reviewers;
  expect(reviewers?.find((r) => r.name === "Anna")?.disabled).toBe(0);
});
```

Confirm `cookie` is already defined in this file. It is.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/app.test.ts -t "open_count"`

Expected: FAIL because `open_count` is undefined

- [ ] **Step 3: Implement**

Add to `src/comments.ts`:

```ts
export function countOpenComments(db: Database.Database, projectId: number): number {
  const row = db
    .prepare("SELECT COUNT(*) AS n FROM comments WHERE project_id = ? AND status = 'open'")
    .get(projectId) as { n: number };
  return row.n;
}
```

In `src/app.ts`, import `countOpenComments` and add `open_count: countOpenComments(db, p.id)` on each project in `GET /admin/api/projects`.

Replace the disable handler body:

```ts
const body = await c.req.json<{ disabled?: boolean }>().catch(() => ({}) as { disabled?: boolean });
setReviewerDisabled(db, reviewerId, body.disabled !== false);
return c.json({ ok: true });
```

Add `open_count: number` to `Project` in `web/src/types.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/app.test.ts -t "open_count"`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/comments.ts src/app.ts web/src/types.ts tests/app.test.ts
git commit -m "feat: report open thread counts and allow enabling a reviewer"
```

---

### Task 4: Message catalogs

**Files:**
- Create: `web/src/messages.ts`
- Test: `tests/messages.test.ts`

**Interfaces:**
- Consumes: `Locale` from `web/src/locale.ts`
- Produces: `export const en`, `export type MessageKey = keyof typeof en`, `export const ru: Record<MessageKey, string>`, `export function translateError(message: string, t: (key: MessageKey) => string): string`

- [ ] **Step 1: Write the failing test**

```ts
import { expect, test } from "vitest";
import { en, ru, translateError, type MessageKey } from "../web/src/messages.ts";

test("russian covers every english key", () => {
  const missing = (Object.keys(en) as MessageKey[]).filter((key) => ru[key] !== "" && !ru[key]);
  expect(missing).toEqual([]);
});

test("known API errors map to message keys", () => {
  const t = (key: MessageKey) => en[key];
  expect(translateError("invalid credentials", t)).toBe(en.errInvalidCredentials);
  expect(translateError("sync failed", t)).toBe(en.errSyncFailed);
  expect(translateError("slug taken", t)).toBe("slug taken");
});
```

The filter treats a missing key as a hole. An empty string is allowed only if both sides set it; do not leave Russian values empty. The assertion `ru[key] !== "" && !ru[key]` fails for `undefined`. Keep every Russian value non-empty.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/messages.test.ts`

Expected: FAIL with failed to resolve `../web/src/messages.ts`

- [ ] **Step 3: Write the catalogs**

Create `web/src/messages.ts` with `en` as const, `export type MessageKey = keyof typeof en`, and `export const ru = { ... } satisfies Record<MessageKey, string>` so a missing Russian key fails `npm run build:web` as well as the test. Keys and English values:

| Key | English |
| --- | --- |
| `adminSubtitle` | `/ Admin` |
| `projectsTitle` | `Projects` |
| `newProject` | `New project` |
| `fieldTitle` | `Title` |
| `fieldSlug` | `Slug` |
| `fieldGitUrl` | `Git URL` |
| `fieldBranch` | `Branch` |
| `fieldPathA` | `Variant A path` |
| `fieldPathB` | `Variant B path` |
| `placeholderBranch` | `main` |
| `createProject` | `Create project` |
| `emptyProjects` | `No projects yet. Use the form on the left.` |
| `accounts` | `Accounts` |
| `none` | `none` |
| `off` | `off` |
| `reviewerName` | `Reviewer name` |
| `password` | `Password` |
| `addAccount` | `Add account` |
| `syncGit` | `Sync git` |
| `exportJson` | `Export JSON` |
| `copyLink` | `Copy link` |
| `copied` | `Copied` |
| `copyFailed` | `Copy failed` |
| `openCount` | `{count} open` |
| `syncing` | `Sync…` |
| `commitCount` | `{count} commits` |
| `disable` | `Disable` |
| `enable` | `Enable` |
| `resetPassword` | `Reset password` |
| `savePassword` | `Save password` |
| `adminPasswordNote` | `Same password as the admin password` |
| `signIn` | `Sign in` |
| `show` | `Show` |
| `hide` | `Hide` |
| `homeHint` | `Open /admin or a client link /p/<slug>.` |
| `noCommitsTitle` | `No commits` |
| `noCommitsBody` | `No commits yet. An admin needs to press Sync git.` |
| `showComments` | `Show comments` |
| `showDock` | `Show dock` |
| `previewTitle` | `Preview` |
| `reviewToolbar` | `Review settings` |
| `hideDock` | `Hide dock` |
| `variant` | `Variant` |
| `width` | `Width` |
| `viewport390` | `Mobile 390` |
| `viewport390Tip` | `Mobile · 390` |
| `viewport768` | `Tablet 768` |
| `viewport768Tip` | `Tablet · 768` |
| `viewport1440` | `Desktop 1440` |
| `viewport1440Tip` | `Desktop · 1440` |
| `commit` | `Commit` |
| `mode` | `Mode` |
| `browse` | `Browse` |
| `element` | `Element` |
| `rect` | `Highlight` |
| `comments` | `Comments` |
| `newComment` | `New comment` |
| `hideComments` | `Hide comments` |
| `pageCommentHint` | `Not attached to an element or a highlight` |
| `comment` | `Comment` |
| `save` | `Save` |
| `noOpenComments` | `No open comments` |
| `kindElement` | `element` |
| `kindRect` | `highlight` |
| `kindPage` | `page` |
| `reply` | `Reply` |
| `replyVerb` | `Reply` |
| `elementComment` | `Comment on element` |
| `elementFallback` | `element` |
| `elementPlaceholder` | `Comment on element…` |
| `rectNote` | `Note on highlight` |
| `markType` | `Mark type` |
| `rectangle` | `Rectangle` |
| `rectPlaceholder` | `Note on highlight…` |
| `send` | `Send` |
| `close` | `Close` |
| `anchorMissing` | `Element not found on this version` |
| `errInvalidCredentials` | `Invalid credentials` |
| `errNamePassword` | `Name and password required` |
| `errPassword` | `Password required` |
| `errName` | `Name required` |
| `errTooMany` | `Too many attempts` |
| `errSyncFailed` | `Sync failed` |
| `errFailed` | `Failed` |
| `errNotFound` | `Not found` |
| `errUnauthorized` | `Unauthorized` |
| `errGeneric` | `Something went wrong` |
| `variantLabelA` | `Variant A` |
| `variantLabelB` | `Variant B` |
| `language` | `Language` |

Russian values, same keys, in order: `/ Админка`, `Проекты`, `Новый проект`, `Название`, `Slug`, `Git URL`, `Ветка`, `Путь варианта A`, `Путь варианта B`, `main`, `Создать проект`, `Проектов пока нет. Заполните форму слева.`, `Учётки`, `нет`, `выкл`, `Имя ревьюера`, `Пароль`, `Добавить учётку`, `Sync git`, `Экспорт JSON`, `Копировать ссылку`, `Скопировано`, `Не удалось скопировать`, `{count} открытых`, `Sync…`, `{count} коммитов`, `Выключить`, `Включить`, `Сбросить пароль`, `Сохранить пароль`, `Тот же пароль, что у админки`, `Войти`, `Показать`, `Скрыть`, `Откройте /admin или клиентскую ссылку /p/<slug>.`, `Нет коммитов`, `Нет коммитов — админ должен нажать Sync git.`, `Показать комментарии`, `Показать панель`, `Превью`, `Параметры ревью`, `Скрыть панель`, `Вариант`, `Ширина`, `Мобильный 390`, `Мобильный · 390`, `Планшет 768`, `Планшет · 768`, `Десктоп 1440`, `Десктоп · 1440`, `Коммит`, `Режим`, `Просмотр`, `Элемент`, `Выделить`, `Комментарии`, `Новый комментарий`, `Скрыть комментарии`, `Без привязки к элементу или выделению`, `Комментарий`, `Сохранить`, `Нет открытых комментариев`, `элемент`, `выделить`, `страница`, `Ответ`, `Ответ`, `Комментарий к элементу`, `элемент`, `Комментарий к элементу…`, `Заметка к выделению`, `Тип метки`, `Прямоугольник`, `Заметка к выделению…`, `Отправить`, `Закрыть`, `Элемент не найден на этой версии`, `Неверные данные`, `Нужны имя и пароль`, `Нужен пароль`, `Нужно имя`, `Слишком много попыток`, `Синк не удался`, `Ошибка`, `Не найдено`, `Нет доступа`, `Что-то пошло не так`, `Вариант A`, `Вариант B`, `Язык`.

`translateError` maps those API strings to the `err*` keys and returns `message` unchanged when the string is absent from the map. `t` is called with the mapped key.

Helpers used by later tasks:

```ts
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? ""));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/messages.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add web/src/messages.ts tests/messages.test.ts
git commit -m "feat: add english and russian chrome messages"
```

---

### Task 5: Locale provider and switches

**Files:**
- Create: `web/src/i18n.tsx`
- Modify: `web/src/main.tsx`
- Modify: `web/index.html` (`lang="en"`)
- Modify: `web/src/AppChrome.tsx`
- Modify: `web/src/review/ReviewToolbar.tsx`
- Modify: `web/src/review/CommentsPanel.tsx`
- Modify: `web/src/styles.css` (only if the switch needs the existing `.lang-seg` class; do not remove the phone hide rule)

**Interfaces:**
- Consumes: `resolveLocale`, `Locale`, `en`, `ru`, `MessageKey`, `fill`, `translateError`
- Produces: `export function I18nProvider({ children }: { children: ReactNode })` and `export function useI18n(): { locale: Locale; setLocale: (locale: Locale) => void; t: (key: MessageKey) => string }`

Storage key is `dr-locale`. `setLocale` writes it and sets `document.documentElement.lang`. Initial state uses `resolveLocale(localStorage.getItem("dr-locale"), navigator.languages)`.

`LangSwitch` is a local function in `web/src/i18n.tsx`:

```tsx
export function LangSwitch() {
  const { locale, setLocale, t } = useI18n();
  return (
    <div className="seg lang-seg" role="group" aria-label={t("language")}>
      {(["en", "ru"] as const).map((code) => (
        <button
          key={code}
          type="button"
          aria-pressed={locale === code}
          onClick={() => setLocale(code)}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 1: Wire the provider**

Wrap `<App />` in `main.tsx` with `<I18nProvider>`. Set `<html lang="en">` in `web/index.html`.

Render `<LangSwitch />` inside the admin `.topnav` in `AppChrome` when `href` is `/admin`. Add an optional `trailing` slot if the header has no room; the switch is the trailing node, aligned to the right of the existing brand link. The header is already `justify-content: space-between`.

Render `<LangSwitch />` in `ReviewToolbar` after the mode group, inside `.dock-track`.

Render `<LangSwitch />` in `CommentsPanel` `.comments-head-actions`, and give that instance `className` visibility only at the phone shell. Add this rule under the existing `.review.shell-phone .dock .lang-seg { display: none; }`:

```css
.comments-head .lang-seg { display: none; }
.review.shell-phone .comments-head .lang-seg { display: inline-flex; }
```

- [ ] **Step 2: Build**

Run: `npm run build:web`

Expected: exit 0

- [ ] **Step 3: Commit**

```bash
git add web/src/i18n.tsx web/src/main.tsx web/index.html web/src/AppChrome.tsx web/src/review/ReviewToolbar.tsx web/src/review/CommentsPanel.tsx web/src/styles.css
git commit -m "feat: add the english and russian chrome switch"
```

---

### Task 6: Replace chrome copy

**Files:**
- Modify: `web/src/App.tsx`
- Modify: `web/src/AdminApp.tsx`
- Modify: `web/src/LoginScreen.tsx`
- Modify: `web/src/ui.tsx`
- Modify: `web/src/admin/CreateProjectForm.tsx`
- Modify: `web/src/admin/ProjectCard.tsx`
- Modify: `web/src/ReviewApp.tsx`
- Modify: `web/src/review/ReviewToolbar.tsx`
- Modify: `web/src/review/CommentsPanel.tsx`
- Modify: `web/src/review/AnchorDrafts.tsx`
- Test: `tests/chrome-copy.test.ts`

**Interfaces:**
- Consumes: `useI18n`, `translateError`, `fill`, message keys from Task 4
- Produces: no new exports. User-facing Cyrillic in `web/src` remains only inside `web/src/messages.ts`.

- [ ] **Step 1: Write the failing scan**

```ts
import fs from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";

function files(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return files(full);
    return full.endsWith(".ts") || full.endsWith(".tsx") ? [full] : [];
  });
}

test("chrome source keeps russian copy inside messages.ts", () => {
  const hits = files("web/src")
    .filter((file) => !file.endsWith(`${path.sep}messages.ts`))
    .filter((file) => /[А-Яа-яЁё]/.test(fs.readFileSync(file, "utf8")));
  expect(hits).toEqual([]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/chrome-copy.test.ts`

Expected: FAIL listing current tsx files

- [ ] **Step 3: Replace strings**

Call `useI18n()` in each component that renders copy. Pass `translateError(err.message, t)` instead of `err.message`, and `t("errGeneric")` in the unknown branch.

`CreateProjectForm` initial state is `""` for title, slug, git URL, branch, path A, and path B. Placeholders use `t("placeholderBranch")` on the branch field only. Variant payloads use `t("variantLabelA")` and `t("variantLabelB")` at submit time.

`PasswordField` show/hide uses `t("show")` and `t("hide")`.

`CommentsPanel` kind labels use `t("kindElement")`, `t("kindRect")`, and `t("kindPage")` inside the component, not a module-level Russian map.

`ReviewApp` sets the anchor-missing string with `t("anchorMissing")`.

Leave the button text `Resolve` as the literal `Resolve`.

Map every former Russian string from the catalog in Task 4. Do not add copy that is not in that catalog.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/chrome-copy.test.ts && npm run build:web`

Expected: PASS and build exit 0

- [ ] **Step 5: Commit**

```bash
git add web/src tests/chrome-copy.test.ts
git commit -m "feat: render chrome copy from the locale catalogs"
```

---

### Task 7: Admin card actions

**Files:**
- Modify: `web/src/admin/ProjectCard.tsx`
- Modify: `web/src/admin/CreateProjectForm.tsx` (already empty from Task 6)
- Modify: `web/src/AdminApp.tsx`
- Modify: `web/src/api.ts` only if `api()` already returns parsed JSON and throws `Error` with the server message. It does. Do not change auth.

**Interfaces:**
- Consumes: `Project.open_count`, `Reviewer`, `t`, `fill`, `translateError`
- Produces: no new exports

- [ ] **Step 1: Empty list**

In `AdminApp`, when `projects.length === 0`, render `<p className="project-meta">{t("emptyProjects")}</p>` in the list column.

- [ ] **Step 2: Card actions**

In `ProjectCard`:

- Show `fill(t("openCount"), { count: project.open_count })`.
- Copy button writes `` `${window.location.origin}/p/${project.slug}` `` with `navigator.clipboard.writeText`. Success sets status `t("copied")`. Failure sets `t("copyFailed")`.
- Sync success sets `fill(t("commitCount"), { count: data.history?.length ?? 0 })`. Catch sets `translateError(message, t)`.
- For each reviewer whose `name === "admin"`, render `t("adminPasswordNote")` and no Disable or Reset.
- For every other reviewer, Disable posts `{ disabled: true }` when `reviewer.disabled` is 0, and `{ disabled: false }` otherwise. The button label is `t("disable")` or `t("enable")`.
- Reset toggles an inline password input for that reviewer id. Save posts `{ password }` to `POST /admin/api/projects/${project.id}/reviewers/${reviewer.id}/reset`. Show `translateError` on failure and clear the field on success.

Keep Sync git and Export JSON as `t("syncGit")` and `t("exportJson")`. Those English strings are `Sync git` and `Export JSON`.

- [ ] **Step 3: Build**

Run: `npm run build:web && npx vitest run tests/chrome-copy.test.ts tests/app.test.ts`

Expected: build exit 0, tests PASS

- [ ] **Step 4: Commit**

```bash
git add web/src/admin/ProjectCard.tsx web/src/AdminApp.tsx
git commit -m "feat: finish admin account actions and project status"
```

---

### Task 8: Focus Frame tokens and Inter

**Files:**
- Create: `web/public/fonts/inter-latin-400-normal.woff2`
- Create: `web/public/fonts/inter-latin-600-normal.woff2`
- Modify: `web/src/styles.css` (`:root` and `@font-face`)
- Modify: `src/index.ts` (serve `/fonts/*`)

**Interfaces:**
- Consumes: nothing from earlier tasks
- Produces: CSS variables `--fg: #111318`, `--accent: #6E63FF`, `--surface: #F1F2F5`, `--surface-warm: #F7F7FA`, and a new `--accent-on-dark: #8C85FF`

- [ ] **Step 1: Download the font files**

```bash
mkdir -p web/public/fonts
curl -fsSL -o web/public/fonts/inter-latin-400-normal.woff2 \
  https://cdn.jsdelivr.net/fontsource/fonts/inter@5.2.8/latin-400-normal.woff2
curl -fsSL -o web/public/fonts/inter-latin-600-normal.woff2 \
  https://cdn.jsdelivr.net/fontsource/fonts/inter@5.2.8/latin-600-normal.woff2
```

Expected: both files exist and are larger than 20 KB.

- [ ] **Step 2: Point tokens and fonts at Focus Frame**

Add at the top of `web/src/styles.css`:

```css
@font-face {
  font-family: Inter;
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url("/fonts/inter-latin-400-normal.woff2") format("woff2");
}
@font-face {
  font-family: Inter;
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url("/fonts/inter-latin-600-normal.woff2") format("woff2");
}
```

Set `--fg: #111318`, `--surface: #F1F2F5`, `--surface-warm: #F7F7FA`, `--accent: #6E63FF`, `--accent-hover: #5b51e6`, `--accent-active: #4f46d6`, and add `--accent-on-dark: #8C85FF`. Set `--font-display` and `--font-body` to `"Inter", "Helvetica Neue", Helvetica, Arial, sans-serif`. Leave `--accent-on: #ffffff`. Do not change dock, pin, or rect layout rules.

In `src/index.ts`, next to the other `serveStatic` calls:

```ts
app.use("/fonts/*", serveStatic({ root: webDist }));
```

- [ ] **Step 3: Build**

Run: `npm run build:web && npx vitest run`

Expected: build exit 0, full Vitest PASS. `web/dist/fonts/inter-latin-400-normal.woff2` exists.

- [ ] **Step 4: Commit**

```bash
git add web/public/fonts web/src/styles.css src/index.ts
git commit -m "feat: apply Focus Frame color and self-hosted Inter"
```

---

### Task 9: Docs

**Files:**
- Modify: `AGENTS.md`
- Modify: `docs/usage.md`
- Modify: `docs/usage.en.md`

**Interfaces:**
- Consumes: the behavior from Tasks 2 and 6
- Produces: no code

- [ ] **Step 1: Update the three files**

In `AGENTS.md`, replace the UI-copy bullet with: Chrome copy is English by default and Russian through the EN | RU switch. Technical labels stay Resolve, SHA, and Sync git.

In `docs/usage.md` step 4 and `docs/usage.en.md` step 4, say the automatic reviewer login is **admin** and it uses the admin password. Replace the export button name in `AGENTS.md` with **Export JSON** only in the English instruction path; `docs/usage.md` may keep the Russian label **Экспорт JSON** because that file is the Russian guide. The English guide uses **Export JSON**.

- [ ] **Step 2: Search for the old login name**

Run: `rg "Админ" docs AGENTS.md tests src web/src`

Expected: no match in `tests`, `src`, or `web/src`. Matches may remain in the older 2026-09-15 spec and in `docs/usage.md` prose that talks about the admin role, as long as the account login is `admin`.

- [ ] **Step 3: Commit**

```bash
git add AGENTS.md docs/usage.md docs/usage.en.md
git commit -m "docs: describe english chrome and the admin reviewer login"
```

---

## Self-review

Spec coverage: locale resolution is Task 1. Catalogs, known errors, and untranslated server text are Tasks 4 and 6. The phone switch is Task 5. The `admin` rename and collision rule are Task 2. Empty form, empty list, copy, `open_count`, sync error, disable, enable, and reset are Tasks 3, 6, and 7. The built-in row without Disable or Reset is Task 7. Focus Frame and Inter are Task 8. Docs are Task 9. Project edit/delete, comment-body translation, i18next, and a locale cookie are absent.

Placeholder scan: message values are listed in Task 4. UI tasks name the keys they call.

Type consistency: `resolveLocale`, `MessageKey`, `open_count`, `renameLegacyAdminReviewers`, `countOpenComments`, `useI18n`, `translateError`, and `fill` use the same names in every task.
