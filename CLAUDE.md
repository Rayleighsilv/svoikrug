# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## О проекте

SvoiKrug — социальная сеть для организации камерных встреч и квартирников: события, RSVP, подписки на хостов, оценки участников после встреч, in-app уведомления.

Monorepo из двух независимых npm-проектов (без workspaces):

- `api/` — Fastify 5 + Prisma 6 + PostgreSQL 16, TypeScript 6, CommonJS, собирается `tsc` в `dist/`.
- `web/` — Next.js 14 (App Router) + React 18 + Tailwind 3, TypeScript 5 (strict).
- `docker-compose.yml` — dev-стек с hot-reload и bind-mount'ами.
- `docker-compose.prod.yml` — production-стек (multi-stage образы, без bind-mount'ов).

Основной сценарий разработки — Docker-first. Node 20 используется в Docker-образах и CI; локально допустимы более новые версии.

## Команды

### Разработка через Docker

```bash
docker compose up -d              # db + backend + frontend
docker compose logs -f backend
docker compose logs -f frontend
docker compose exec backend sh    # shell внутри API-контейнера
docker compose exec db psql -U svoikrug -d svoikrug_dev
```

Порты dev-стека: frontend `:3000`, backend `:4000`, PostgreSQL `:5432`.

### Локальный запуск без Docker

```bash
cd api
npm ci
npm run dev          # tsx watch src/server.ts
npm run lint         # eslint src
npm run typecheck    # tsc --noEmit
npm run build        # tsc -> dist/
npm start            # node dist/server.js

cd web
npm ci
npm run dev          # next dev
npm run lint         # next lint
npx tsc --noEmit
npm run build        # next build (output: standalone)
npm start            # next start
```

### Production

```bash
cp .env.example .env   # заполнить JWT_SECRET, COOKIE_SECRET (64+ символов), POSTGRES_PASSWORD, NEXT_PUBLIC_API_URL
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

- `NEXT_PUBLIC_API_URL` инлайнится в клиентский бандл **на этапе сборки** — это build arg, а не runtime env.
- API в `NODE_ENV=production` отказывается стартовать с пустыми, короткими (<32) или дефолтными (`change_me`) секретами.
- В production-образе API нет Prisma CLI (`--omit=dev`), поэтому `prisma migrate deploy` нужно запускать отдельным инструментальным контейнером/шагом.

### Проверки (то же, что в CI)

```bash
cd api && npm run lint && npx tsc --noEmit
cd web && npm run lint && npx tsc --noEmit && npm run build
```

CI: `.github/workflows/ci.yml`, триггеры — push и PR в `main`, Node 20.x, кэш npm.

### Тесты

Автоматических тестов сейчас нет (ни test-runner'а, ни test-скриптов). Проверка — lint + typecheck + build и ручные запросы к API.

### Prisma / миграции

```bash
docker compose exec backend npx prisma migrate dev --name <название>
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npx prisma migrate status
docker compose exec backend npx prisma generate
```

Обязательные правила:

- Менять схему только через `prisma migrate dev`, коммитить папку миграции вместе со `schema.prisma`.
- **`prisma db push` не используется** — он не сохраняет историю миграций.
- В репозитории одна базовая миграция `api/prisma/migrations/20260909000000_init`.
- `api/prisma.config.ts` — конфиг Prisma CLI (adapter + dotenv). Runtime-клиент создаётся отдельно в `api/src/server.ts` через `PrismaPg`.

## Архитектура

### Backend

Точка входа — `api/src/server.ts`. Все зависимости, сервисы, handlers и роуты регистрируются вручную (автозагрузки модулей нет): при добавлении модуля нужно явно подключить его в `server.ts`.

Доменный модуль (`api/src/modules/<domain>/`) обычно состоит из:

- `schema.ts` — Zod-схемы и типы входа;
- `service.ts` — бизнес-логика и запросы Prisma;
- `handler.ts` — HTTP-слой: парсинг/валидация, cookies, коды ответов;
- `routes.ts` — объявление путей, `preHandler: [fastify.authenticate]`, rate-limit-конфиг (у events роуты объявлены прямо в `server.ts`).

Ключевые решения:

- **Ошибки.** Все доменные ошибки — `AppError(message, statusCode, code)` из `api/src/common/errors.ts`. Глобальный `setErrorHandler` в `server.ts` маппит `AppError`, `ZodError`, известные ошибки Prisma (`P2002` → 409, `P2003` → 400, `P2025` → 404, `P2021` → 500) и 4xx Fastify-плагинов. Клиент получает `{ error: true, message, code?, details? }`.
- **Аутентификация.** Access JWT (15 мин) и refresh-токен (7 дней) — в httpOnly cookies `accessToken` / `refreshToken`. Refresh-токен — случайные 64 байта, в БД хранится только SHA-256 хеш (`refresh_tokens`). При каждом refresh пара ротируется; повторное использование уже отозванного refresh-токена отзывает **все** активные refresh-токены пользователя (защита от кражи).
- **`authenticate` plugin** (`api/src/plugins/authenticate.ts`) сначала проверяет `Authorization: Bearer`, затем cookie `accessToken`, верифицирует JWT и выставляет `request.userId`. В production cookies `secure`.
- **Rate limiting** in-memory: глобально 100 req/min; для auth — register 5/min, login 10/min, refresh 30/min (`api/src/modules/auth/routes.ts`).
- **Загрузка файлов.** `@fastify/multipart`: 1 файл, до 2 MB, JPEG/PNG/WebP. Аватары пишутся в `uploads/avatars` относительно `process.cwd()`, старые файлы удаляются; `@fastify/static` раздаёт `uploads/` по `/uploads/*`. В prod — volume `uploads_data`, в dev — bind-mount.
- **CORS** жёстко задан в `server.ts`: в production только `https://svoikrug.ru`, в dev — `localhost:3000`. При смене домена правка обязательна.
- **Жизненный цикл события:** `draft → published → closed → archived`. Владение проверяется в сервисах. Уведомления подписчикам создаются только при переходе `draft → published`.
- **RSVP:** `pending → approved / rejected / attended / cancelled`. Хост отмечает посещаемость; оценки доступны только для `closed`/`archived` событий и только участникам со статусом `attended`.
- **Рейтинги:** одна оценка на пару (событие, оценивающий, оцениваемый), 1–5. `Profile.trustScore` пересчитывается как среднее всех полученных оценок.
- **Лента** (`/feed/events`) — только `published` события хостов, на которых подписан пользователь.
- **Health check** — `GET /health` выполняет `SELECT 1`.

### Frontend

- `AuthProvider` оборачивает всё приложение в `web/src/app/layout.tsx`; состояние пользователя берётся из `GET /auth/me` при загрузке.
- `web/src/middleware.ts` — только проверка **наличия** cookie `accessToken` для `/profile`, `/events/new`, `/events/edit`; JWT здесь не валидируется. Гостя редиректит на `/login?from=<path>`; авторизованного на `/login` и `/register` — на `/`.
- `web/src/lib/api.ts` — единый fetch-клиент:
  - всегда `credentials: 'include'` (httpOnly cookies);
  - при 401 с кодом `INVALID_TOKEN` или `NO_TOKEN` вызывает `POST /auth/refresh`;
  - параллельные 401 делят один refresh-промис (защита от гонок), исходный запрос повторяется один раз;
  - при неудачном refresh с реально истёкшей сессией — редирект на `/login`;
  - для `FormData` не ставит `Content-Type` (boundary выставляет браузер).
- Валидация на клиенте (`web/src/lib/validation.ts`) **дублирует** правила Zod бэкенда вручную — общего пакета схем нет. При изменении правил регистрации/события нужно синхронно править оба места.
- `NEXT_PUBLIC_API_URL` (default `http://localhost:4000`) используется в `api.ts` и `avatar.ts`. Относительные `/uploads/...` резолвятся в абсолютный URL через `resolveAvatarUrl`.
- Интерактивные страницы/компоненты — `'use client'`; серверные компоненты там, где не нужны хуки.

### База данных

Модели (`api/prisma/schema.prisma`): `users`, `profiles`, `events`, `event_guests`, `subscriptions`, `ratings`, `refresh_tokens`, `notifications`.

Важные ограничения:

- `users.email`, `profiles.nickname` — unique;
- `event_guests (eventId, userId)` и `subscriptions (followerId, followingId)` — составные unique;
- все связи — `ON DELETE CASCADE`;
- enum'ы: `UserStatus`, `EventStatus`, `GuestStatus`;
- индексы на `events (status, startsAt)`, `event_guests (eventId, status)`, `ratings (ratedId, createdAt)` и др.

## Инфраструктура

- **Dev** (`docker-compose.yml`, `Dockerfile.dev`): bind-mount исходников, hot-reload (`tsx watch` / `next dev`), PostgreSQL проброшен на `:5432`.
- **Prod** (`docker-compose.prod.yml`, `api/Dockerfile`, `web/Dockerfile`):
  - отдельный Compose-проект `svoikrug-prod` (не пересекается с dev volumes/network);
  - `restart: always`, без bind-mount'ов, БД **не** публикует порт;
  - API: multi-stage, `npm ci --omit=dev`, Prisma Client генерируется в builder, запуск от non-root `node`, `uploads/` writable;
  - web: multi-stage, `output: 'standalone'`, в runner копируются `.next/standalone`, `.next/static`, `public`, запуск `node server.js` от non-root.
- **CI** (`.github/workflows/ci.yml`): push/PR в `main`; API — `npm ci`, lint, `tsc --noEmit`; web — `npm ci`, `tsc --noEmit`, `next build`. Деплоя пока нет.
- `.env` и `api/.env` не коммитятся. Шаблоны — `.env.example` и `api/.env.example`.

## Текущие ограничения

- Rate limiting хранится в памяти — для нескольких инстансов нужен Redis.
- Аватары лежат на локальном диске — для продакшена нужен S3/Cloudinary.
- Уведомления только по запросу (polling), без WebSocket/SSE/push/email.
- Поиск событий — простой `ILIKE` по title/description, без полнотекстового поиска.
- Автоматических тестов нет.
- CI не содержит шага деплоя (осознанно, до стабилизации проверок).

## Конвенции

- Идентификаторы и код — на английском; UI-тексты, сообщения об ошибках и комментарии — на русском.
- Backend: `camelCase` для переменных/функций, `PascalCase` для классов; порядок слоёв `schema → service → handler → routes`; входные данные всегда валидируются Zod; доменные ошибки — только через `AppError`.
- Frontend: `PascalCase` для компонентов, `camelCase` для хуков; стили — Tailwind utility-классы; избегать `any`.
- Не редактировать существующие файлы миграций и не использовать `prisma db push`.

## Ссылки

- Fastify: https://www.fastify.io/docs/latest/
- Prisma: https://www.prisma.io/docs
- Next.js App Router: https://nextjs.org/docs/app
- Zod: https://zod.dev
