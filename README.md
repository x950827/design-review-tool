# Design Review Tool

Self-hosted HTML design review: named logins, live git preview, A/B, 390/768/1440, pin / highlight / page threads.

**How to use it** (humans and agents): [docs/usage.md](docs/usage.md).  
Agents working in this repo: [AGENTS.md](AGENTS.md).

## Run

```bash
cp .env.example .env
npm install
npm test
npm run build:web
ADMIN_PASSWORD=... SESSION_SECRET=... npm run dev
```

Open `http://127.0.0.1:8787/admin`. Create a project (private git URL + variant folder paths), add reviewer name+password, press **Sync git**. Client URL: `/p/<slug>`.

On a VDS bind `HOST=0.0.0.0` and one port. Put a read-only deploy key in `GIT_SSH_KEY`. HTTP without a domain sends the password in the clear.

After `web/` changes run `npm run build:web` again. Restart the process if you edited `src/bridge.js`.

## Spec / plan

- `docs/superpowers/specs/2026-09-15-design-review-portal-design.md`
- `docs/superpowers/plans/2026-09-15-design-review-portal.md`

The live UI (floating pin card, highlight note bar, `+` for unanchored comments) is the source of truth where it differs from the original spec.
