# Security

Design Review Tool is a self-hosted app. One admin password from the environment, named reviewer accounts, HMAC-signed cookies. There is no public registration.

## Preview HTML is trusted

Pages synced from git are served on the same origin as the app and run in the review iframe. Any response under `/p/` clears the admin cookie, so opening a project logs the admin out before that HTML can call `/admin/api`. The reviewer cookie stays: the review screen needs it, and preview script can use that reviewer session. Sync only repositories you trust.

SVG responses from the preview are sent with `Content-Security-Policy: sandbox`. Path traversal, including symlinks that leave the checkout, is rejected.

## Cookies and the proxy

`COOKIE_SECURE=true` behind HTTPS. Cookies stay `HttpOnly` and `SameSite=Lax`.

Login rate limits use the socket address. `X-Forwarded-For` is used only when `TRUST_PROXY=true`, and only then should a reverse proxy overwrite that header. The limiter is in-memory: one process, 10 attempts per minute per address and login scope. Several replicas need a shared limiter in front.

## Git

Remote URLs must be `https://`, `ssh://`, `git@`, or an absolute filesystem path. Values that look like git options are rejected. SSH keys are a runtime mount (`compose.ssh.yaml`), not part of the image. Git stderr is logged on the server and not returned to the browser.

## Reporting

Open a private security advisory on GitHub, or contact the maintainer directly. Please do not file a public issue for an unfixed vulnerability.
