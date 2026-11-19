# Tasks: React + PostgreSQL

A full-stack task tracker:

- **client/**: React 19 + Vite. You can add, edit, complete and delete tasks, filter them by status and search them. It supports light and dark mode and works on phones.
- **server/**: Express 5 REST API using `pg` (node-postgres), with input validation and integration tests.
- **PostgreSQL 16** stores the tasks (`server/db/schema.sql`).

```
client/            React app (Vite dev server proxies /api → :4000)
server/
  db/schema.sql    tables, enums, updated_at trigger (idempotent)
  db/init.js       applies the schema
  db/seed.js       loads sample tasks
  src/app.js       Express app (CORS, JSON, error handling)
  src/routes/      /api/tasks CRUD
  test/            node:test integration tests against a real database
docker-compose.yml Postgres for local development
```

## Quick start

Requires Node.js 22+ and either Docker or a local PostgreSQL.

```bash
npm install                      # installs client + server (npm workspaces)
cp server/.env.example server/.env

docker compose up -d             # starts Postgres (also applies the schema on first run)
npm run db:init                  # apply schema (safe to re-run)
npm run db:seed                  # optional sample data

npm run dev                      # API on :4000, React on http://localhost:5173
```

**Without Docker**, create the role and database yourself and keep the same `DATABASE_URL`:

```sql
CREATE USER tasks WITH PASSWORD 'tasks';
CREATE DATABASE tasks OWNER tasks;
```

## Production

```bash
npm run build    # builds client/dist
npm start        # Express serves the API and the built React app on $PORT
```

## Tests

The tests truncate the `tasks` table, so point them at a separate database:

```bash
createdb -O tasks tasks_test     # or: CREATE DATABASE tasks_test OWNER tasks;
DATABASE_URL=postgres://tasks:tasks@localhost:5432/tasks_test npm test
```

## API

| Method | Path              | Description                                              |
| ------ | ----------------- | -------------------------------------------------------- |
| GET    | `/api/health`     | Database connectivity check                              |
| GET    | `/api/tasks`      | List tasks. Optional `?status=todo\|in_progress\|done&q=text` |
| GET    | `/api/tasks/:id`  | Get one task                                             |
| POST   | `/api/tasks`      | Create: `{ title, description?, status?, priority?, due_date? }` |
| PATCH  | `/api/tasks/:id`  | Update any subset of those fields                        |
| DELETE | `/api/tasks/:id`  | Delete                                                   |

`priority` is `low | medium | high`; `due_date` is `YYYY-MM-DD` or `null`.

## Configuration (`server/.env`)

| Variable       | Default                                          |
| -------------- | ------------------------------------------------ |
| `DATABASE_URL` | `postgres://tasks:tasks@localhost:5432/tasks`    |
| `PORT`         | `4000`                                           |
| `CORS_ORIGIN`  | unset (all origins); comma-separated list to restrict |
