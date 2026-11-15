# SETUP.md — запуск и работа на двух ПК

Проект Docker-first: на хосте нужны только WSL2, Docker Desktop и git.
Node.js на Windows/WSL не обязателен — все команды выполняются в контейнерах.

## Первый запуск на новой машине

### 1. Требования

- Windows 10/11 с WSL2 (Ubuntu 22.04 или новее).
- Docker Desktop с включённой интеграцией WSL2:
  Settings → Resources → WSL Integration → выбрать дистрибутив.
- git внутри WSL.
- Свободные порты `3000`, `4000`, `5432`.

Проверка:

```bash
docker version
docker compose version
git --version
```

Docker Desktop должен быть запущен до всех команд ниже.

### 2. Клонировать репозиторий в Linux-ФС

```bash
cd ~
git clone git@github.com:Rayleighsilv/svoikrug.git
cd ~/svoikrug
```

Важно: работайте в `~/svoikrug` (ext4 внутри WSL), а не в `/mnt/c/...`.
На смонтированном диске Windows медленный I/O, не работают file-watchers
и путаются права — Docker и hot-reload будут тормозить.

### 3. Создать локальные env-файлы

```bash
cp .env.example .env

# Только если запускаете API/Prisma вне Docker:
cp api/.env.example api/.env
```

`.env` — локальный файл каждой машины, в git он не попадает. Для dev-стека
значения уже заданы в `docker-compose.yml`; корневой `.env` нужен для
`docker-compose.prod.yml` и переопределений. Реальные секреты хранятся
только на сервере.

### 4. Собрать и поднять стек

```bash
docker compose up -d --build
docker compose ps
```

Первая сборка занимает несколько минут. Дождитесь, пока `svoikrug_db`
станет `healthy`, а `svoikrug_backend` и `svoikrug_frontend` — `Up`.

### 5. Применить миграции и сгенерировать Prisma Client

```bash
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npx prisma generate
```

`migrate deploy` применяет уже существующие миграции из
`api/prisma/migrations`. Новые миграции создаются только через
`prisma migrate dev` (см. README); `prisma db push` не используется.

### 6. Заполнить БД демо-данными

```bash
docker compose exec backend npx prisma db seed
```

Скрипт `api/prisma/seed.ts` идемпотентен: удаляет пользователей
`seed.*@example.com` и создаёт их заново вместе с событиями, отзывами
и уведомлениями.

Демо-логин: `seed.user1@example.com` / `Password123`.

### 7. Проверить, что всё работает

```bash
curl http://localhost:4000/health
# {"status":"ok","database":"connected"}
```

- Web: <http://localhost:3000>
- API: <http://localhost:4000>
- Вход: <http://localhost:3000/login> → `seed.user1@example.com` / `Password123`

Проверка логина через API (должен вернуться `200` и cookies
`accessToken` / `refreshToken`):

```bash
curl -i -X POST http://localhost:4000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"seed.user1@example.com","password":"Password123"}'
```

## Ежедневная работа на двух ПК

**Правило: не работайте на двух машинах без синхронизации.** Начали на
одной — закончили и запушили, только потом продолжайте на другой.
Незакоммиченные изменения, локальные ветки и stash на второй ПК не появятся.

### Конец дня (на текущем ПК)

```bash
git status          # должно быть чисто
git add -A
git commit -m "..."
git push
git status          # снова чисто
```

Незаконченную работу лучше закоммитить в рабочую ветку и запушить (WIP-коммит
надёжнее stash: stash живёт только на одной машине).

### Начало дня (на другом ПК)

```bash
cd ~/svoikrug
git pull
git status
```

Дальше — по тому, что пришло в pull:

| Что изменилось | Что сделать |
|---|---|
| `api/package.json`, `api/package-lock.json`, `web/package.json`, `web/package-lock.json` | `docker compose down && docker compose up -d --build` |
| новые папки в `api/prisma/migrations/` | `docker compose exec backend npx prisma migrate deploy && docker compose exec backend npx prisma generate` |
| только код без зависимостей и миграций | достаточно `docker compose up -d` |
| изменился `.env.example` | вручную обновить локальный `.env` |

Посмотреть, что именно пришло:

```bash
git diff --name-only ORIG_HEAD HEAD
```

Если после pull контейнеры не поднялись — `docker compose logs -f backend`
и `docker compose ps`.

### База данных

- У каждого ПК своя локальная БД в Docker-томе `postgres_data`.
  Данные между машинами не синхронизируются и не должны.
- Общее состояние — только схема и миграции в git; наполнение — seed:
  `docker compose exec backend npx prisma db seed`.
- `docker compose down` сохраняет том с БД. `docker compose down -v` удаляет
  его — после этого нужны `migrate deploy` и `db seed`.
- Не переносите `postgres_data` между машинами и не коммитьте дампы БД.

## Секреты и `.env`

- В git отслеживается только `.env.example`. `.env`, `.env.*`, `api/.env`
  и `web/.env.local` — в `.gitignore`, на каждой машине свои.
- В `docker-compose.yml` — только dev-заглушки. `docker-compose.prod.yml`
  берёт `JWT_SECRET`, `COOKIE_SECRET` и `POSTGRES_PASSWORD` из `.env`;
  API отказывается стартовать в production со слабыми/дефолтными секретами.
- Настоящие ключи генерируются на сервере: `openssl rand -hex 48`.
  Не коммитить их, не пересылать в чатах и не вставлять в код.
- Проверка перед коммитом:

  ```bash
  # должно быть пусто (только *.env.example — допустимо)
  git ls-files | grep -E '(^|/)\.env$'
  ```
