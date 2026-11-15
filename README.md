# SvoiKrug

Платформа для организации квартирников и локальных встреч.

- `web/` — фронтенд (Next.js App Router)
- `api/` — бэкенд (Fastify + Prisma + PostgreSQL)
- `docker-compose.yml` — сервисы `db` / `backend` / `frontend`

## Статус

Активная разработка. Реализованы: регистрация и вход (httpOnly JWT-cookies),
профили и аватары, события (создание, приватный адрес, фильтры по формату
и вайбу, онлайн-встречи), RSVP и лист ожидания, подписки на хостов, отзывы
и теги, чаты событий, избранное, уведомления. Тестов нет; CI проверяет
lint, typecheck и сборку web.

## Быстрый старт

Полная инструкция — [SETUP.md](SETUP.md) (первый запуск на новой машине
и ежедневная работа на двух ПК). Кратко:

```bash
cp .env.example .env
docker compose up -d --build
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npx prisma generate
docker compose exec backend npx prisma db seed
```

Web — <http://localhost:3000>, API — <http://localhost:4000>, health —
<http://localhost:4000/health>. Демо-логин: `seed.user1@example.com` /
`Password123`.

## Миграции базы данных (Prisma)

Схема БД описана в `api/prisma/schema.prisma`.

**Правило: все изменения схемы выполняются только через `prisma migrate dev`.**

```bash
# изнутри контейнера backend (там доступен хост БД `db`)
docker exec svoikrug_backend sh -lc "cd /app && npx prisma migrate dev --name <описание>"
```

Применение миграций на чистой/новой базе:

```bash
docker exec svoikrug_backend sh -lc "cd /app && npx prisma migrate deploy"
```

Проверка состояния:

```bash
docker exec svoikrug_backend sh -lc "cd /app && npx prisma migrate status"
```

### Почему не `prisma db push`

`prisma db push` меняет БД напрямую, не создавая файлов миграций и не сохраняя историю.
Из-за этого схему невозможно воспроизвести на чистой базе — именно так ранее и появилась
«сломанная» цепочка миграций (первая миграция начиналась с `DROP TABLE` для несуществующих
таблиц и падала на теневой БД, поэтому `migrate dev`/`deploy` не работали).

**`prisma db push` в этом проекте больше не используется.**

### Текущая история

- `api/prisma/migrations/20260909000000_init` — единая базовая миграция, описывающая всю
  схему с нуля (таблицы, enum'ы, индексы, внешние ключи). На dev-БД она помечена как
  применённая через `prisma migrate resolve --applied`, данные сохранены.

Порядок при изменении схемы:

1. Отредактируйте `api/prisma/schema.prisma`.
2. Выполните `prisma migrate dev --name <описание>` — будет создана и применена новая миграция.
3. Закоммитьте новую папку миграции вместе с изменением схемы.
