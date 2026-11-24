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
3. **Start the database:** `npm run db:up`
4. **Create the tables:** `npm run db:migrate`
5. **Load the sample users:** `npm run db:seed` imports the users in `db.json` (add `-- --dry-run` to preview first).
6. **Start everything:** `npm run dev` starts the database (if it isn't running), the API at `http://localhost:3000` and the app at `http://localhost:4200` together, with colored `[api]` and `[client]` log prefixes. Press Ctrl+C once to stop both. To run them separately, use `npm run api` and `npm start` in two terminals.

### Local password-reset email testing

The password-reset feature is a prerequisite for this flow; it is not yet on `develop`. Once available and its database migration has been applied, you can use the optional Mailpit inbox to test without sending real email:

1. Start Docker and run `npm run mail:up`. Mailpit listens only on localhost, with SMTP on port 1025 and the web inbox at [http://localhost:8025](http://localhost:8025). It captures messages instead of delivering them to recipients.
2. In `server/.env`, set `APP_URL=http://localhost:4200`, `SMTP_HOST=127.0.0.1`, `SMTP_PORT=1025`, `SMTP_SECURE=false`, and `SMTP_FROM=NgLab <no-reply@example.test>`. Leave `SMTP_USER` and `SMTP_PASSWORD` unset. Restart the API after changing its configuration. These settings are for local testing only, not production.
3. Start the app, create an account, and request a password reset for its email address. Open the message in the Mailpit inbox, follow the reset link, choose a new password, and sign in with it.
4. Run `npm run mail:down` to stop the inbox. `npm run mail:test` runs a local SMTP/inbox smoke test and requires `curl`.

Mailpit is not started by `npm run dev` or the database commands. Messages are temporary and are deleted when Mailpit stops; the inbox contains reset links, so do not expose it or use real production credentials. When Mailpit is stopped, a reset request still returns the same response for known and unknown accounts; check API logs for delivery errors.

## Git Flow

`main` contains production-ready code and `develop` is the integration branch. All new features start from `develop`:

```sh
git switch develop
git pull --ff-only
git switch -c feature/<short-name>
```

Open pull requests from `feature/*` branches into `develop`. Release branches use `release/<version>` and merge into both `main` and `develop`. Production fixes use `hotfix/<short-name>` from `main` and also merge back into both long-lived branches.

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

### Authorization

Users can manage and delete their own account. Admins can also create, edit, and delete user profiles and change their admin role. When editing another non-admin user, an admin can optionally set a password; this creates login credentials if needed and invalidates the user's existing sessions. Admins cannot set passwords for admins, and users can change their own passwords on My account. Profiles created by an admin do not have login credentials until a password is set.

On My account, deleting an account requires confirmation. After deletion succeeds, all its sessions are invalidated, a confirmation appears briefly, and the user is redirected to login. Failed deletions leave the account signed in and can be retried.

The role migration marks the existing user with email `kenreynolds78@icloud.com` as an admin and leaves all others as regular users. If that user does not exist when the migration runs, it creates no admin. Public signup never grants admin privileges based on email: after creating and verifying the intended account, a database administrator must explicitly set its `users.admin` column to `true`. Existing admins can then manage roles in the application.

The migration history and design decisions are in `.docs/postgresql-migration-plan.md`.

## Build

Run `npm run build` to build the Angular app. The build artifacts are stored in `client/dist/`.
