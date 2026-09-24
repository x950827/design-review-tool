# Design Review Tool

[English](README.md)

Свой сервер для ревью HTML из git. Админ подключает репозиторий, ревьюер входит по имени, комментарии крепятся к элементу, выделению или странице. React — только рамка. Макет остаётся HTML в iframe.

Подробный сценарий для людей и агентов: [docs/usage.md](docs/usage.md). English: [docs/usage.en.md](docs/usage.en.md).

Пример магазина лежит в этом репозитории. В проекте укажите `https://github.com/x950827/design-review-tool.git`, ветку `main`, папки `examples/catalog/a` и `examples/catalog/b`, затем **Sync git**.

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

Образ уже собран. Клонировать репозиторий и собирать его на сервере не нужно:

```bash
curl -fsSL -o compose.yaml \
  https://raw.githubusercontent.com/x950827/design-review-tool/main/compose.yaml
printf '%s\n' 'ADMIN_PASSWORD=choose-a-password' 'SESSION_SECRET=at-least-16-chars' > .env
docker compose up -d
```

TLS, приватный git и остальные детали: [docs/deploy.md](docs/deploy.md). Compose публикует только `127.0.0.1:8787`. Пароли и SSH-ключ в образ не кладут.

## Участие

Pull request принимаются только из форков. См. [CONTRIBUTING.md](CONTRIBUTING.md).

## Безопасность

[SECURITY.md](SECURITY.md).

## Лицензия

[MIT](LICENSE). Это приложение, не библиотека для npm (`"private": true`).
