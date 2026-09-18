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

Local cookies are not `Secure` (`COOKIE_SECURE=false`). Production recipe: [docs/deploy.md](docs/deploy.md) (`HOST=0.0.0.0` inside the container, compose publishes `127.0.0.1:8787` only, `COOKIE_SECURE=true`, persistent `DATA_DIR`, HTTPS reverse proxy). Do not bake passwords or an SSH deploy key into the image; private git uses `compose.ssh.yaml` (`./secrets/git_ssh` → `/run/secrets/git_ssh`).

After `web/` changes run `npm run build:web` again. Restart the process if you edited `src/bridge.js` or `src/pin-target.js`.

## Spec / plan

- `docs/superpowers/specs/2026-09-15-design-review-portal-design.md`
- `docs/superpowers/plans/2026-09-15-design-review-portal.md`

The live UI (floating pin card, highlight note bar, `+` for unanchored comments) is the source of truth where it differs from the original spec.
