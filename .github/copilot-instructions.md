# ng-lab Copilot Instructions

## Git workflow

- This repository follows Git Flow. `main` is the production branch and `develop` is the integration branch.
- Create every new feature from `develop` with the `feature/<short-name>` prefix. Merge completed features back into `develop` through a pull request.
- Use `release/<version>` branches from `develop` to prepare production releases; merge releases into both `main` and `develop`.
- Use `hotfix/<short-name>` branches from `main` for urgent production fixes; merge hotfixes into both `main` and `develop`.
- Never implement unrelated features directly on `main` or `develop`. Keep work on its appropriately prefixed branch.
- Before switching tasks, check the current branch and worktree so uncommitted changes stay on the correct branch.

## Tooling and verification

- The repository has three parts: `client/` (the Angular app, with its own `package.json`, `angular.json` and `node_modules`), `server/` (the API, a separate npm project) and the repo root (Docker Compose, `db/`, `db.json`, docs and a `package.json` of forwarding scripts). Run commands from the root; the Angular CLI itself must run inside `client/` (use `npm run ng -- ...` from the root).
- Use the repository-local Angular CLI through npm scripts:
  - `npm run dev` starts the database, the API and the Angular app together (`concurrently`, in the root `package.json`); `npm start` starts only the Angular development server at `http://localhost:4200`.
  - `npm run db:up` starts PostgreSQL (Docker Compose), `npm run db:migrate` applies the migrations and `npm run db:seed` imports `db.json`; `npm run api` starts the Express API at `http://localhost:3000`. First-time setup needs `npm run install:all` plus `.env` and `server/.env` (copy the `.env.example` files and set the passwords); see the README.
  - `npm run build` produces the default production build in `client/dist/ng-lab/browser`.
  - `npm run watch` builds continuously with the development configuration.
- Angular tests use Jasmine and Karma. Run all tests once with `npm test -- --watch=false`; run one spec with `npm test -- --include='src/app/users/state/users.store.spec.ts' --watch=false` (spec paths are relative to `client/`). The test runner needs a browser unless its browser configuration is overridden.
- API tests (Vitest, in `server/test/`) run against a throwaway Postgres with `npm run api:test`. They truncate tables, so they must never point at the development database (they refuse to). `server/bruno/` is a Bruno collection for trying the API by hand.
- No lint script or ESLint configuration is currently present.
- Production builds enforce a 600 kB initial-bundle warning / 800 kB error budget and 2 kB / 4 kB component-style budgets.

## Architecture

- This is an Angular 21 standalone application in `client/`. `client/src/main.ts` bootstraps `AppComponent` with `appConfig`; application-wide router and HTTP providers are in `client/src/app/app.config.ts`. Do not introduce `AppModule`, feature modules, or a shared Material module.
- `app.routes.ts` has two layout routes: `ShellLayoutComponent` (`client/src/app/shell/`, sidebar and breadcrumb bar) is guarded by `authGuard`, redirects to and lazy-loads the users feature, and `AuthLayoutComponent` (`client/src/app/auth/layout/`, full-page header and footer) is guarded by `guestGuard` and lazy-loads the auth feature (`/login` and `/signup`). `ThemeStore` owns the dark-mode flag that `AppComponent` applies as the root `dark` class. `client/src/app/users/users.routes.ts` owns the feature's list route (`/users`) plus create and edit routes (`/users/manage` and `/users/manage/:id`).
- The users feature is layered as follows:
  - `UsersService` owns HTTP calls to the Express API (`GET/POST /users`, `PUT/DELETE /users/:id`); its base URL comes from `client/src/environments/environment*.ts`.
  - Root-scoped `UsersStore` owns the users signal and performs CRUD state updates. It navigates to `/users` after successful create or update.
  - Route pages coordinate store access and routing; presentational components receive signal inputs and emit outputs.
  - The edit page receives `:id` through component input binding, derives the selected user from the store, and loads data on direct visits when the store is empty.
- Accounts are credentials for a user: `POST /accounts` (`server/src/accounts/`) validates the user fields (email, first name, last name, optional nickname, with the same rules as the users API) plus a password, then in one transaction inserts the user and an `accounts` row (`user_id` primary key and foreign key with `ON DELETE CASCADE`, scrypt `password_hash`). It returns `201` with the user shape, maps a duplicate email to `409 email_taken` and is rate limited. The client side is `AccountsService`, the root `AuthStore` and the signup form/page under `client/src/app/auth/`. See `.docs/auth-signup-plan.md`.
- Login uses server-side sessions: `POST /auth/login` checks the password and sets an HttpOnly, SameSite=Lax `session` cookie holding a random token (only its SHA-256 hash is stored in the `sessions` table), `POST /auth/logout` deletes the session and `GET /auth/me` returns the current user. `requireAuth` (`server/src/auth/middleware.ts`) protects `/users` and sets `req.auth`, which is where roles will attach. Failed logins are rate limited, state-changing requests from another `Origin` are refused, and CORS allows credentials for the configured origin. On the client, `credentialsInterceptor` sends the cookie to the API and returns to `/login` on a 401, `SessionStore` holds the current user, `AuthStore` runs the sign-up and login forms, and signup success goes to `/login` while login success goes to `/users`. Users tests use a stand-in session by default (`startServer`); pass `{ realAuth: true }` to test authentication itself.
- The backend is the Express and TypeScript API in `server/` (a separate npm project) on PostgreSQL 18, accessed through Drizzle. Preserve the numeric `User.id` and the camelCase fields in `client/src/app/users/models/user.interface.ts`: the API returns exactly that shape, stores blank `nickname` and `currentActivity` as `NULL` and returns them as `''`, and ignores any `id` sent on create. `db.json` is only the seed fixture for `npm run db:seed`; nothing reads or writes it at runtime. Schema changes go through Drizzle migrations in `server/drizzle/`. The migration history is in `.docs/postgresql-migration-plan.md`.

## Repository conventions

- Keep components standalone and import the exact Angular Material directives/components they use in each component's `imports` array. Component tests follow this by placing standalone components in `TestBed.configureTestingModule({ imports: [...] })`.
- Prefer framework signal APIs used throughout the app: `input()`, `output()`, `signal()`, and `computed()`. Use `inject()` for dependencies. The application is zoneless (there is no `zone.js` dependency), so UI state changed by application code must be signal-based.
- Retain reactive forms for the user form: `UserFormComponent` owns the `FormGroup`, validates first/last name and email, and patches it from its `selectedUser` signal input via an `effect()`.
- Preserve the store's current failure semantics unless intentionally changing UX: CRUD methods leave client state untouched on HTTP errors and show a generic error notice (for example a duplicate email, which the API rejects with a 409, shows "Unable to add the user"). Store tests use `provideHttpClient()`, `provideHttpClientTesting()`, and `HttpTestingController` to assert requests and state changes.
- Use Angular control flow (`@if`, `@for`) in templates. The Material table's dynamic columns come from `headers` and `headerFields`; preserve the `keyof User` relationship when adding user fields.
- Styling combines Angular Material's prebuilt indigo-pink theme with Tailwind utilities. Tailwind scans `client/src/**/*.html` and `client/src/**/*.ts`, uses `darkMode: "class"`, and applies utilities as `!important`; dark mode is set by toggling the `dark` class at the root app template.
- TypeScript and Angular templates are strict (`strict`, `strictTemplates`, and strict DI/input checks). Keep types compatible without broad casts; the empty creation id is the existing form behavior and the API ignores it, so the database assigns the real numeric id.
