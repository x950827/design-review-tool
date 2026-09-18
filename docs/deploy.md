# Production on a VDS

One Node process, SQLite + git checkouts on a persistent volume, HTTPS at a reverse proxy.

## Build and run

```bash
cp .env.example .env
# set ADMIN_PASSWORD and SESSION_SECRET (16+ chars); do not commit .env

export ADMIN_PASSWORD='...'
export SESSION_SECRET='...'   # 16+ characters

docker compose build
docker compose up -d
```

Compose interpolates `ADMIN_PASSWORD` and `SESSION_SECRET` from the environment or a local `.env` next to `compose.yaml`. The process refuses to start if they are missing. Do not put real passwords in git.

The image runs `npm start` with `HOST=0.0.0.0`, `DATA_DIR=/app/data`, `COOKIE_SECURE=true`. SQLite (`app.db`) and git clones/checkouts live in the `design-review-data` volume. Do not copy `.env`, passwords, or an SSH key into the image (`.dockerignore` already drops `secrets/`, `*.key`, `id_rsa`, `id_ed25519`, `.env`).

Health: `GET /health` → `{ "ok": true }`.

If the data volume is not writable by uid 1000 (the `node` user in the official image), `chown` the mounted directory to that uid once.

## Production env (no secrets)

```
HOST=0.0.0.0
PORT=8787
DATA_DIR=/app/data
COOKIE_SECURE=true
ADMIN_PASSWORD=<runtime-only>
SESSION_SECRET=<runtime-only-16-plus-chars>
# Private git via compose.ssh.yaml — do not set a host path here:
# GIT_SSH_KEY=/run/secrets/git_ssh
```

Local HTTP keeps `COOKIE_SECURE=false` (the default). Behind HTTPS set `true` for both admin (`Path=/admin`) and reviewer (`Path=/p/<slug>`) cookies. `HttpOnly` and `SameSite=Lax` stay unchanged.

## Private git (deploy key)

Do not bake the key into the image. Dockerfile does not `COPY` it; `.dockerignore` excludes `secrets/` and key filenames. Default `compose.yaml` has no key at all (public HTTPS remotes).

For a private remote, use the overlay `compose.ssh.yaml`. It is a working read-only bind, not a commented placeholder:

- host file: `./secrets/git_ssh`
- container path: `/run/secrets/git_ssh`
- env: `GIT_SSH_KEY=/run/secrets/git_ssh`

```bash
mkdir -p secrets
cp "$DEPLOY_KEY" secrets/git_ssh
chown 1000:1000 secrets/git_ssh
chmod 400 secrets/git_ssh
docker compose -f compose.yaml -f compose.ssh.yaml up -d
```

`$DEPLOY_KEY` is the deploy key already on the VDS. `chmod 400` is required: OpenSSH refuses a world-readable key, so this is a bind mount, not a Docker secret (those are typically `0444`). uid `1000` is the `node` user in the image.

The overlay itself:

```yaml
services:
  design-review:
    environment:
      GIT_SSH_KEY: /run/secrets/git_ssh
    volumes:
      - type: bind
        source: ./secrets/git_ssh
        target: /run/secrets/git_ssh
        read_only: true
```

Do not set `GIT_SSH_KEY` to a host path such as `/home/…/.ssh/id_ed25519`: that path does not exist in the container unless this bind is present. Project `ssh_key_path` in SQLite should be `/run/secrets/git_ssh` when the app runs in Docker.

Public HTTPS remotes do not need a key and should keep using plain `docker compose up -d`.

## HTTPS reverse proxy

The app speaks HTTP on `127.0.0.1:8787`. `compose.yaml` publishes only that loopback address (`127.0.0.1:8787:8787`), so the port is not on all interfaces. Terminate TLS in Caddy or nginx on the same machine. With `COOKIE_SECURE=true`, the browser must see HTTPS or it will drop the session cookie.

Caddy:

```
review.example.com {
  reverse_proxy 127.0.0.1:8787
}
```

nginx:

```
server {
  listen 443 ssl;
  server_name review.example.com;
  # ssl_certificate and ssl_certificate_key from your usual cert path
  location / {
    proxy_pass http://127.0.0.1:8787;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Bind the compose port to localhost (this is the default in `compose.yaml`):

```yaml
ports:
  - "127.0.0.1:8787:8787"
```

Without HTTPS, passwords travel in the clear. Do not publish port 8787 on `0.0.0.0` or the public internet.

The reverse proxy must send `X-Forwarded-For` (Caddy `reverse_proxy` does this by default; the nginx snippet above uses `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for`). Login rate limiting keys off that header.

## Login rate limit

`LoginLimiter` is already in the process. It caps `POST /admin/api/login` and `POST /p/:slug/api/login` at **10 attempts per 60 seconds** per key. The key is `X-Forwarded-For` plus a scope: `admin` for the admin endpoint, the project slug for a reviewer login. Missing `X-Forwarded-For` collapses every client onto the literal key `ip`, so they share one bucket.

The limiter is an in-memory map on that Node process. One container (the compose recipe) is enough. Several processes or replicas each keep their own counters; put a shared rate limiter in front of them if you run more than one.

## Verification without Docker

Image build already runs `npm test` and `npm run build:web`. On the host:

```bash
npm ci
npm test
npm run build:web
HOST=0.0.0.0 DATA_DIR=/app/data COOKIE_SECURE=true npm start
```
