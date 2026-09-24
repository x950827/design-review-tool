# Design Review Tool

[English](README.md)

Свой сервер для ревью HTML из git. Админ подключает репозиторий, ревьюер входит по имени, комментарии крепятся к элементу, выделению или странице. React — только рамка. Макет остаётся HTML в iframe.

Подробный сценарий для людей и агентов: [docs/usage.md](docs/usage.md).

## Возможности

- Именные учётки ревьюеров. Свободной регистрации нет.
- Превью выбранного коммита, в том числе приватного репозитория через deploy key.
- Варианты (A/B) и ширины 390 / 768 / 1440.
- Три вида комментария: пин на элемент, прямоугольное выделение, заметка к странице.
- Экспорт JSON открытых тредов для человека или агента, который правит макет.

## Запуск

```bash
cp .env.example .env
npm install
npm test
npm run build:web
ADMIN_PASSWORD=... SESSION_SECRET=... npm run dev
```

`SESSION_SECRET` — не короче 16 символов. Открыть `http://127.0.0.1:8787/admin`, создать проект (git URL и пути папок вариантов), добавить ревьюера, нажать **Sync git**. Ссылка для ревью: `/p/<slug>`.

Локальные cookie без флага `Secure` (`COOKIE_SECURE=false`). После правок в `web/` снова `npm run build:web`. После правок `src/bridge.js` или `src/pin-target.js` процесс нужно перезапустить.

## Продакшен

[docs/deploy.md](docs/deploy.md). В контейнере процесс слушает `0.0.0.0`, Compose публикует только `127.0.0.1:8787`. TLS завершает обратный прокси, `COOKIE_SECURE=true`, `TRUST_PROXY=true`, SQLite и git-checkout лежат в `DATA_DIR`. Пароли и SSH-ключ в образ не кладут. Приватный git — через `compose.ssh.yaml` (`./secrets/git_ssh` → `/run/secrets/git_ssh`).

## Участие

Pull request принимаются только из форков. См. [CONTRIBUTING.md](CONTRIBUTING.md).

## Безопасность

[SECURITY.md](SECURITY.md).

## Лицензия

[MIT](LICENSE). Это приложение, не библиотека для npm (`"private": true`).
