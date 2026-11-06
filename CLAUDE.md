# CLAUDE.md — SvoiKrug

Социальная сеть для камерных встреч и квартирников: события, RSVP, подписки на хостов, оценки, in-app уведомления.

## Стек

- `api/` — Fastify 5.8, Prisma 6.19 + `@prisma/adapter-pg`, PostgreSQL 16, Zod 4, TypeScript 6 (CommonJS, `tsc` → `dist/`).
- `web/` — Next.js 14.2 (App Router), React 18, Tailwind 3, TypeScript 5 (strict).
- Два независимых npm-проекта без workspaces. Docker-first; Node 20 в Docker-образах и CI.
- Dev-стек — `docker-compose.yml`; prod — `docker-compose.prod.yml` (multi-stage, без bind-mount).

## Структура

- `api/src/modules/<domain>/` — слои `schema.ts` (Zod) → `service.ts` (Prisma) → `handler.ts` (HTTP) → `routes.ts`.
- `api/src/plugins/` — `jwt.ts`, `authenticate.ts` (выставляет `request.userId`).
- `api/src/common/errors.ts` — `AppError(message, statusCode, code)`.
- `api/src/server.ts` — ручная регистрация плагинов, сервисов и роутов; events-роуты объявлены здесь.
- `web/src/app/` — App Router: `login/`, `register/`, `events/`, `profile/`, `users/`, `format/[format]/`, `hosts/`.
- `web/src/lib/` — `api.ts` (fetch + refresh), `validation.ts` (дублирует Zod-правила бэкенда вручную), `formats.ts` (mock-каталог форматов/подкатегорий и счётчиков недели).
- `web/src/contexts/` — `AuthContext.tsx`, `CityContext.tsx`, `ThemeContext.tsx`; `AuthProvider` в `app/layout.tsx`.
- `web/src/middleware.ts` — проверяет только наличие cookie `accessToken`.

## Где что

- Схема БД: `api/prisma/schema.prisma` — модели `User`, `Profile`, `Event`, `Tag`, `EventTag`, `EventGuest`, `Subscription`, `Rating`, `RefreshToken`, `Notification`.
- Регистрация роутов: `api/src/server.ts` + `api/src/modules/*/routes.ts`.
- UI авторизации: `web/src/app/login`, `web/src/app/register`.
- Фото событий: `web/src/components/EventImage.tsx` — skeleton при загрузке, gradient+emoji при ошибке/отсутствии.
- Создание события: `web/src/app/events/new/page.tsx` — визард из 5 шагов; черновик — `web/src/lib/eventDraft.ts` (localStorage + IndexedDB для фото). Поля визарда: `durationMinutes`, `waitlistEnabled`, `plusOneEnabled`, `houseRules`/`houseRulesChips`, `applicationQuestion`, `sportLevel`, `weatherDependent`, `budgetType`/`budgetAmount`/`budgetNote`, `venueType`, `platform`.
- Уведомления: `web/src/app/notifications/page.tsx` и `NotificationBell` — группы «Заявки / Мои события / Системные / Безопасность». Ответ на вопрос заявки хранится в `event_guests.application_answer` и отдаётся только хосту (в публичном списке гостей — `null`).
- Prisma CLI-конфиг: `api/prisma.config.ts`; runtime-клиент создаётся в `api/src/server.ts` через `PrismaPg`.
- Dockerfile'ы dev: `api/Dockerfile.dev`, `web/Dockerfile.dev`.

## Команды

```bash
docker compose up -d --build
docker compose logs -f backend
docker compose exec backend npx prisma migrate dev --name <name>
docker compose exec backend npx tsc --noEmit
docker compose exec frontend npx tsc --noEmit
curl http://localhost:4000/health
```

Порты dev: web `:3000`, api `:4000`, postgres `:5432`.
CI (`.github/workflows/ci.yml`): API — lint + `tsc --noEmit`; web — `tsc --noEmit` + `next build`. Тестов нет.

## Ключевые инварианты

- Доменные ошибки — только `AppError`; глобальный `setErrorHandler` в `server.ts` маппит `ZodError`, Prisma (`P2002` → 409, `P2003` → 400, `P2025` → 404, `P2021` → 500) и 4xx Fastify.
- Вход валидируется Zod на бэкенде; клиентские правила в `web/src/lib/validation.ts` правятся синхронно.
- Access/refresh JWT — только в httpOnly cookies `accessToken` / `refreshToken`; в БД хранится SHA-256 хеш refresh-токена, при refresh пара ротируется.
- Lifecycle события: `draft → published → closed → archived`; владение проверяется в сервисах.
- RSVP: `pending → approved / rejected / attended / cancelled`; оценки доступны только для `closed`/`archived` и участникам со статусом `attended`.
- Лента `/feed/events` — только `published` события хостов, на которых подписан пользователь.
- CORS зашит в `server.ts`: prod — `https://svoikrug.ru`, dev — `localhost:3000`.
- Rate limiting in-memory: глобально 100 req/min; auth — register 5/min, login 10/min, refresh 30/min.

## Конвенции

- Код и идентификаторы — на английском; UI-тексты, сообщения об ошибках и комментарии — на русском.
- Backend: `camelCase` / `PascalCase`, порядок `schema → service → handler → routes`.
- Frontend: `PascalCase` для компонентов, `camelCase` для хуков, Tailwind utility-классы, избегать `any`.

## Запреты

- НЕ обновлять Prisma до v7.
- НЕ использовать `prisma db push`.
- НЕ хранить токены в localStorage.
- НЕ править файлы миграций руками; схема — только через `prisma migrate dev`.
- НЕ трогать `.gitignore`; игнор контекста — `.claude/settings.json`.

## Никогда не читать (контекст)

`node_modules/`, `.next/`, `dist/`, `build/`, `coverage/`, `*.log`, `.env`, `*.env.local`,
`package-lock.json`, `api/uploads/`, `*.dump`, `api/prisma/migrations/**` (только в задачах про миграции, по явному запросу).
`docker-compose.yml` и `docker-compose.prod.yml` — читать, они маленькие и критичны.

## Правила работы агента

- Отвечать по-русски и кратко; НЕ выводить файлы целиком: только дифф или изменённый фрагмент до 40 строк.
- НЕ читать повторно файлы, уже прочитанные в сеансе; вместо чтения файла целиком использовать поиск по паттерну (grep/rg).
- Логи команд выводить только ключевыми строками: ошибки, HTTP-статусы, exit-коды.
- Проверки (tsc, curl, docker compose ps) запускать не более одного раза на шаг; повтор только после правок кода.
- Формат задачи: план до 5 пунктов → реализация → одна верификация → отчёт таблицей «критерий/результат» до 10 строк.
- НЕ создавать абстракции, файлы и зависимости сверх задачи; рефакторинг только по прямому запросу.
- При неясности задавать ОДИН уточняющий вопрос, а не угадывать.
- В будущих сеансах НЕ изменять этот файл правил без явного запроса пользователя; любое изменение правил — только коммитом.
