# Angular Lab

Generated with [Angular CLI](https://github.com/angular/angular-cli) version 15.0.2.

This project serves as a front end development playground for me to experiment with various aspects of front end development and further cement my knowledge and skills in advanced Angular concepts and best practices.

[Angular Material](https://v15.material.angular.io/) is used in the project, and is added via a separate material module. You can add to that module as desired.

[NgRx](https://ngrx.io/) is used for UI state management.

[TailwindCSS](https://tailwindcss.com/) is used for quick, easy styling of various UI elements.


## Getting started

The app has three parts:

| Folder | What it is |
|---|---|
| `client/` | The Angular app (its own `package.json`, `angular.json` and `node_modules`). |
| `server/` | The Express and TypeScript API, with its Drizzle migrations, tests and Bruno collection. |
| repo root | PostgreSQL 18 in Docker (`docker-compose.yml`, `db/`), the `db.json` sample data, the docs, and a small `package.json` whose scripts run everything from one place. |

Run all the commands below from the repo root. The root scripts (`npm start`, `npm run build`, `npm test`, `npm run ng -- ...`) forward to `client/`, so `npm test -- --watch=false` works as before. To use the Angular CLI directly, `cd client` first.

**Prerequisites:** Node.js 22 or newer and Docker with Compose.

1. **Install dependencies:** `npm run install:all` (installs the root, `client/` and `server/`).
2. **Create your secrets.** Neither file is committed.
   - `cp .env.example .env`, then set `POSTGRES_PASSWORD` and `APP_DB_PASSWORD` to generated values, for example `openssl rand -base64 24 | tr -d '/+='`.
   - `cp server/.env.example server/.env`, then replace `<APP_DB_PASSWORD>` and `<POSTGRES_PASSWORD>` in the two connection URLs with the same values.
   - For password-reset emails, also set `APP_URL`, `SMTP_HOST`, `SMTP_FROM` and, when authentication is required, `SMTP_USER` and `SMTP_PASSWORD` in `server/.env`.
3. **Start the database:** `npm run db:up`
4. **Create the tables:** `npm run db:migrate`
5. **Load the sample users:** `npm run db:seed` imports the users in `db.json` (add `-- --dry-run` to preview first).
6. **Start everything:** `npm run dev` starts the database (if it isn't running), the API at `http://localhost:3000` and the app at `http://localhost:4200` together, with colored `[api]` and `[client]` log prefixes. Press Ctrl+C once to stop both. To run them separately, use `npm run api` and `npm start` in two terminals.

### Useful commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the database, the API and the app together. Both reload when you change source files. |
| `npm run db:up` / `db:down` | Start or stop the database container. Data is kept in a Docker volume. |
| `npm run db:reset` | Delete all data and start a fresh database. Run `db:migrate` and `db:seed` again afterwards. |
| `npm run db:psql` | Open `psql` inside the database container. |
| `npm run db:generate` | Generate a migration after changing `server/src/db/schema.ts`. Review the SQL before applying it. |
| `npm run db:migrate` | Apply pending migrations. |
| `npm run db:seed` | Import `db.json`. It refuses a non-empty table unless you add `-- --upsert`. |
| `npm run api:test` | Run the API tests against a throwaway database (started automatically on port 5434). |
| `npm test` | Run the Angular tests. |

`db.json` is only the sample data for `npm run db:seed`; the app does not read or write it. To try the API by hand, open the `server/bruno` folder in [Bruno](https://www.usebruno.com/) and choose the `local` environment. The `/users` API needs a login: run "Create account" and then "Log in" first, and Bruno keeps the session cookie.

The migration history and design decisions are in `.docs/postgresql-migration-plan.md`.

## Build

Run `npm run build` to build the Angular app. The build artifacts are stored in `client/dist/`.
