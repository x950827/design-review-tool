# Chrome: locale, admin, Focus Frame

**Date:** 24 September 2026  
**Status:** approved in discussion, pending review of this file  
**Repo:** design-review-tool

## 1. Goal

Make the portal chrome usable in English and Russian, finish the admin actions the API already supports, and apply the Focus Frame palette that already exists in Open Design.

English is the source language. Russian is the second dictionary. The built-in reviewer login becomes `admin`.

Out of scope: editing or deleting a project, translating comment bodies, ДаниАрт HTML, i18next, a locale cookie.

## 2. Locale

Chrome copy lives in `web/src` as two objects, `en` and `ru`. English keys are the type. The Russian object must cover the same keys or the build fails.

Resolution order:

1. `localStorage` key `dr-locale` when the value is `en` or `ru`.
2. Otherwise `ru` when the first `navigator.languages` entry starts with `ru`.
3. Otherwise `en`.

The EN | RU switch sits in the review dock and in the admin header. It writes `localStorage` and sets `document.documentElement.lang`. The phone review shell keeps the switch in the comments panel header, because the dock hides `.lang-seg` at that width.

Translated: labels, buttons, empty states, tooltips, aria-labels, and known API error strings shown in the chrome (`invalid credentials`, `name and password required`, `password required`, `name required`, `too many attempts`, `sync failed`, `failed`, `not found`, `unauthorized`).

Left as returned by the server: comment and reply bodies, commit subjects, reviewer names, git URLs, slugs, variant labels stored in the database.

`resolveLocale` is a pure function and has a unit test.

## 3. Reviewer login `admin`

`ADMIN_REVIEWER_NAME` becomes `"admin"`. Creating a project still creates that reviewer with the admin password.

On `openDb`, after the schema runs, each project row named `Админ` is renamed to `admin` when that project has no `admin` row. If both names exist, `Админ` stays. The unique `(project_id, name)` constraint must not abort startup. Comments and replies stay on `reviewer_id`; the joined author name becomes `admin` after a successful rename.

The built-in `admin` row has no Disable and no Reset. Its password stays the admin password. Other reviewers get both actions.

## 4. Admin screen

The create form starts empty. Placeholders describe the field. Submitting empty required fields shows the API error, translated.

When the project list is empty, the list column says there are no projects yet and points at the form.

Each project card shows:

- copy control for `{origin}/p/{slug}`, with a short copied / failed status
- open thread count in a new `open_count` field on each project in the list response: `SELECT COUNT(*)` from `comments` where `project_id` matches and `status = 'open'`. No new table and no schema change
- Sync git success as the commit count already returned, and the translated API error when sync fails

A normal reviewer row has Disable and Reset. Reset is an inline password field on that row, then `POST .../reset` with `{ password }`. Disable calls `POST .../disable`. The same route accepts `{ disabled: boolean }`. Missing body keeps today's behavior: disable. `{ disabled: false }` calls the existing `setReviewerDisabled(reviewerId, false)`.

## 5. Brand

`:root` in `web/src/styles.css` uses Focus Frame:

| Token | Value |
| --- | --- |
| Ink / foreground | `#111318` |
| Accent | `#6E63FF` |
| Accent on dark | `#8C85FF` |
| Surface | `#F1F2F5` |
| Near-white page background | `#F7F7FA` |

Hover and active accents are darker and lighter mixes of `#6E63FF`, not Apple blue `#0071e3`. Display and body fonts are Inter at weights 400 and 600, files under `web/public/fonts/`, applied with `@font-face`. No request to a third-party font host. The dock layout, pin popover, and rect bar stay where they are. Existing logo and mark files stay.

## 6. Docs

`AGENTS.md`: chrome copy is English by default, Russian through the switch. Technical labels such as Resolve, SHA, and Sync git stay as they are.

`docs/usage.md` and `docs/usage.en.md`: the automatic reviewer login is `admin`, same password as the admin password.

## 7. Tests

- Project creation expects a reviewer named `admin`, and login with that name and the admin password succeeds.
- A database that already has `Админ` and a comment by that reviewer opens with the name `admin` and the same comment author.
- A database that already has both `Админ` and `admin` in one project still opens, and `Админ` is unchanged.
- `resolveLocale` covers a saved choice, a Russian browser list, and a non-Russian list.

## 8. Done when

An English browser shows English chrome. A Russian browser shows Russian until the switch is used, and the choice survives reload. An existing `Админ` login is `admin` after restart. The admin can copy a review link, see the open count, disable and reset a client account, and cannot disable `admin`. The accent on screen is `#6E63FF`.
