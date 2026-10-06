# Plan: migrate `db.json` to PostgreSQL

Status: **draft, awaiting decisions.** No code has been changed and no database has been connected to. Phase 1 will start at a later time.

## What we found

- **Data:** one collection, `users`, with 10 records. Every record has the same six fields: `id`, `firstName`, `lastName`, `nickname`, `email` and `currentActivity`. There are no duplicate emails or missing values, and the longest value is 29 characters.
- **Frontend contract:** `src/app/users/services/users.service.ts` calls `http://localhost:3000/users` with `GET`, `POST`, `PUT /:id` and `DELETE /:id`. Ids are numbers.
- **The create form sends `id: ''`** in the POST body, and the server must ignore it.
- **Missing piece:** PostgreSQL doesn't serve REST on its own. `json-server` is currently the API, so we need a small backend service between Angular and the database.
- **Local environment:**
  - **Postgres 14:** it's already running on port 5432 (Homebrew), and Docker is installed. PostgreSQL 14 reaches end of life in November 2026, so a newer version is recommended for this project.
  - **`.gitignore`:** it has no `.env` entry yet, which has to be added before any credentials exist.
  - **`.vscode/db-local.json`:** this file exists and has not been opened. Check it for credentials before wiring anything.

## Target design

```
Angular app  ->  REST API (new, server/)  ->  PostgreSQL
 (unchanged)      same contract as json-server
```

**Initial schema:** one table, `users`, matching today's data shape.

| Column | Type | Notes |
|---|---|---|
| `id` | integer, identity | Keeps numeric ids, so no frontend change. |
| `first_name`, `last_name` | text, not null | Minimum 2 characters and a maximum length, matching the form rules. |
| `nickname`, `current_activity` | text, not null, default `''` | Matches the data exactly (blanks are `''` today). |
| `email` | `citext`, not null, **unique** | Case-insensitive uniqueness. |
| `created_at`, `updated_at` | timestamptz | Added now because they're cheap. |

The API and frontend keep camelCase, while the database uses snake_case, with a mapping in the API layer.

**Ready for auth, but nothing built yet:** `users` stays the identity table, because email will become the login. Later migrations would add `roles`, `permissions`, `user_roles`, `role_permissions`, a separate `credentials` table (password hashes) and `sessions`. Those would be many-to-many join tables with foreign keys to `users`, and none of them need to change `users`.

## Phases

Each phase ends with a check and a pause for review, as in the Angular migration.

**Phase 0: decisions.** Settle the open questions below. Also review `.vscode/db-local.json`.

**Phase 1: provision the database.**
- A `docker-compose.yml` with a pinned Postgres major version, a named volume and a health check. It would use a non-default host port (5433) so it can't collide with the existing Postgres 14 on 5432.
- A dedicated `nglab` database and a least-privilege app role, never the superuser.
- `.env` (gitignored) plus a committed `.env.example`, and a `.env` entry added to `.gitignore`.

**Phase 2: schema and migrations.**
- A `server/` folder with its own `package.json`, so its dependencies and `npm audit` results stay separate from the Angular app.
- Version-controlled SQL migrations: the `citext` extension, the `users` table with its constraints, and an `updated_at` trigger.

**Phase 3: the API (replaces `json-server`).** It keeps the exact contract:

| Request | Behavior |
|---|---|
| `GET /users` | Ordered by `id`. json-server returned insertion order, and SQL needs an explicit sort. |
| `POST /users` | Ignores the incoming `id` and returns the created row with its real id. |
| `PUT /users/:id` | The path id wins, and it returns the updated row. |
| `DELETE /users/:id` | Returns `{}`, or 404 if the id doesn't exist. |

- **Safety:** server-side validation of every field, parameterized queries only, and CORS restricted to `http://localhost:4200` instead of allowing any origin. That addresses the earlier review findings about weak input validation and the open CORS setting.
- **Operations:** a `/health` endpoint, and request logging that doesn't print user data (PII).
- **Port:** it stays on port 3000.

**Phase 4: import `db.json`.** A one-off, repeatable import script:
1. Validate the file (duplicates, required fields, trimmed values), with a `--dry-run` mode.
2. Insert all rows in one transaction, **preserving the existing ids** (`OVERRIDING SYSTEM VALUE`).
3. Reset the id sequence to `max(id)`, so the next created user doesn't collide.
4. Verify by comparing the table to the file row by row.

`db.json` is rewritten whenever the app is used against `json-server`, so agree on the 10 current records as the canonical seed. It stays in the repo as the seed fixture.

**Phase 5: frontend cutover.**
- **Expected change:** none, since the contract is identical.
- **Optional (recommended):** move the hardcoded base URL in `users.service.ts` to an environment config. That also clears the "hardcoded HTTP URL" review finding.
- **Verify:** the full create, edit, delete and direct-visit flow against the real database.

**Phase 6: tests.**
- Integration tests for the API run against a real, throwaway Postgres (not mocks), covering CRUD, validation, duplicate emails, 404s and id handling.
- The existing 28 Angular tests shouldn't need changes.

**Phase 7: cleanup and docs.**
- Remove `json-server` and the `backend` npm script, replaced by `db:up`, `db:migrate`, `db:seed` and `api` scripts.
- Removing it also clears its remaining audit findings (`morgan`, `path-to-regexp` and similar).
- Update the README and `.docs`.

## Behavior changes to expect

- **Duplicate emails:** creating a user with an email that already exists will be rejected (409). The frontend currently ignores API errors silently, so the form would just do nothing. A small error message in the UI is needed, treated as a follow-up so this migration stays behavior-neutral.
- **Validation:** the server now enforces the rules (lengths, email format), not just the form.
- **Stricter ids:** non-numeric ids return 400 or 404 instead of being passed through.

## Decisions needed (default first)

1. **Backend framework:** **NestJS** (the same dependency-injection style as Angular, and its guards suit permissions and auth later), or Express/Fastify (lighter).
2. **Database access:** **Drizzle**, which is SQL-first and handles `citext` and CHECK constraints cleanly, or Prisma, or plain SQL migrations. Confirm current versions before installing anything.
3. **Where Postgres runs:** **Docker Compose with a current Postgres (17 or newer)**, or the existing local Postgres 14.
4. **Primary key:** **integer identity**, which needs no frontend change, or UUID, which is better once auth exists but needs frontend type changes.
5. **Blank nickname or activity:** **store `''`** (matches today exactly), or `NULL` (cleaner relationally, but needs API mapping).
6. **Email uniqueness:** **enforce it (case-insensitive)**, or leave duplicates allowed as they are now.
7. **Deletes:** **hard delete** as today. Once users own auth data, soft-delete or an audit trail is likely wanted, so that's a later decision.
