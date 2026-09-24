# Design Review Tool

[Русский](README.ru.md)

Self-hosted review for HTML that lives in git. An admin connects a repository, reviewers open a named login, and comments stick to an element, a highlight, or the page. React is only the frame around the preview. The design stays HTML in an iframe.

## Features

- Named reviewer accounts. No public signup.
- Live preview of a git commit, including private remotes via a deploy key.
- Variant switch (A/B), widths 390 / 768 / 1440.
- Three comment kinds: element pin, rectangle highlight, unanchored page note.
- JSON export of open threads for a person or an agent fixing the design.

## Run

```bash
cp .env.example .env
npm install
npm test
npm run build:web
ADMIN_PASSWORD=... SESSION_SECRET=... npm run dev
```

`SESSION_SECRET` must be at least 16 characters. Open `http://127.0.0.1:8787/admin`, create a project (git URL and variant folder paths), add a reviewer, press **Sync git**. The review URL is `/p/<slug>`.

Local cookies are not `Secure` (`COOKIE_SECURE=false`). After `web/` changes, run `npm run build:web` again. Restart the process after editing `src/bridge.js` or `src/pin-target.js`.

Day-to-day review flow, in Russian: [docs/usage.md](docs/usage.md). Agents working in this repository: [AGENTS.md](AGENTS.md).

## Production

[docs/deploy.md](docs/deploy.md). The container listens on `0.0.0.0`; Compose publishes `127.0.0.1:8787` only. Put TLS on a reverse proxy, set `COOKIE_SECURE=true` and `TRUST_PROXY=true`, and keep SQLite plus git checkouts in `DATA_DIR`. Do not bake passwords or an SSH key into the image. Private git uses `compose.ssh.yaml` (`./secrets/git_ssh` mounted at `/run/secrets/git_ssh`).

## Contributing

Pull requests are accepted only from forks. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Security

[SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE). This repository is an application, not an npm library (`"private": true`).
