# Design Review Tool

Self-hosted HTML design review: named logins, live git preview, A/B, 390/768/1440, pin/rect threads.

## Run

```bash
cd ~/work/personal/design-review-tool
cp .env.example .env
npm install
npm test
npm run build:web
ADMIN_PASSWORD=... SESSION_SECRET=... npm run dev
```

Open `http://127.0.0.1:8787/admin`. Create a project (private git URL + variant folder paths), add reviewer name+password, press Sync. Client URL: `/p/<slug>`.

On a VDS bind `HOST=0.0.0.0` and one port. Put a read-only deploy key in `GIT_SSH_KEY`. HTTP without a domain sends the password in the clear.

## Spec / plan

- `docs/superpowers/specs/2026-09-15-design-review-portal-design.md`
- `docs/superpowers/plans/2026-09-15-design-review-portal.md`
