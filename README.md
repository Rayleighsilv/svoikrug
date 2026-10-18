# SvoiKrug

Платформа для организации квартирников и локальных встреч.

- `web/` — фронтенд (Next.js App Router)
- `api/` — бэкенд (Fastify + Prisma + PostgreSQL)
- `docker-compose.yml` — сервисы `db` / `backend` / `frontend`

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
