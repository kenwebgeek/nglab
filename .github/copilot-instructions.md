# ng-lab Copilot Instructions

## Tooling and verification

- Use the repository-local Angular CLI through npm scripts:
  - `npm start` starts the Angular development server at `http://localhost:4200`.
  - `npm run db:up` starts PostgreSQL (Docker Compose), `npm run db:migrate` applies the migrations and `npm run db:seed` imports `db.json`; `npm run api` starts the Express API at `http://localhost:3000`. First-time setup needs `.env` and `server/.env` (copy the `.env.example` files and set the passwords); see the README.
  - `npm run build` produces the default production build in `dist/ng-lab/browser`.
  - `npm run watch` builds continuously with the development configuration.
- Angular tests use Jasmine and Karma. Run all tests once with `npm test -- --watch=false`; run one spec with `npm test -- --include='src/app/users/state/users.store.spec.ts' --watch=false`. The test runner needs a browser unless its browser configuration is overridden.
- API tests (Vitest, in `server/test/`) run against a throwaway Postgres with `npm run api:test`. They truncate tables, so they must never point at the development database (they refuse to). `server/bruno/` is a Bruno collection for trying the API by hand.
- No lint script or ESLint configuration is currently present.
- Production builds enforce a 600 kB initial-bundle warning / 800 kB error budget and 2 kB / 4 kB component-style budgets.

## Architecture

- This is an Angular 21 standalone application. `src/main.ts` bootstraps `AppComponent` with `appConfig`; application-wide router and HTTP providers are in `src/app/app.config.ts`. Do not introduce `AppModule`, feature modules, or a shared Material module.
- `app.routes.ts` redirects to and lazy-loads the users feature. `src/app/users/users.routes.ts` owns the feature's list route (`/users`) plus create and edit routes (`/users/manage` and `/users/manage/:id`).
- The users feature is layered as follows:
  - `UsersService` owns HTTP calls to the Express API (`GET/POST /users`, `PUT/DELETE /users/:id`); its base URL comes from `src/environments/environment*.ts`.
  - Root-scoped `UsersStore` owns the users signal and performs CRUD state updates. It navigates to `/users` after successful create or update.
  - Route pages coordinate store access and routing; presentational components receive signal inputs and emit outputs.
  - The edit page receives `:id` through component input binding, derives the selected user from the store, and loads data on direct visits when the store is empty.
- The backend is the Express and TypeScript API in `server/` (a separate npm project) on PostgreSQL 18, accessed through Drizzle. Preserve the numeric `User.id` and the camelCase fields in `src/app/users/models/user.interface.ts`: the API returns exactly that shape, stores blank `nickname` and `currentActivity` as `NULL` and returns them as `''`, and ignores any `id` sent on create. `db.json` is only the seed fixture for `npm run db:seed`; nothing reads or writes it at runtime. Schema changes go through Drizzle migrations in `server/drizzle/`. The migration history is in `.docs/postgresql-migration-plan.md`.

## Repository conventions

- Keep components standalone and import the exact Angular Material directives/components they use in each component's `imports` array. Component tests follow this by placing standalone components in `TestBed.configureTestingModule({ imports: [...] })`.
- Prefer framework signal APIs used throughout the app: `input()`, `output()`, `signal()`, and `computed()`. Use `inject()` for dependencies. The application is zoneless (there is no `zone.js` dependency), so UI state changed by application code must be signal-based.
- Retain reactive forms for the user form: `UserFormComponent` owns the `FormGroup`, validates first/last name and email, and patches it from its `selectedUser` signal input via an `effect()`.
- Preserve the store's current failure semantics unless intentionally changing UX: CRUD methods leave client state untouched on HTTP errors and show a generic error notice (for example a duplicate email, which the API rejects with a 409, shows "Unable to add the user"). Store tests use `provideHttpClient()`, `provideHttpClientTesting()`, and `HttpTestingController` to assert requests and state changes.
- Use Angular control flow (`@if`, `@for`) in templates. The Material table's dynamic columns come from `headers` and `headerFields`; preserve the `keyof User` relationship when adding user fields.
- Styling combines Angular Material's prebuilt indigo-pink theme with Tailwind utilities. Tailwind scans `src/**/*.html` and `src/**/*.ts`, uses `darkMode: "class"`, and applies utilities as `!important`; dark mode is set by toggling the `dark` class at the root app template.
- TypeScript and Angular templates are strict (`strict`, `strictTemplates`, and strict DI/input checks). Keep types compatible without broad casts; the empty creation id is the existing form behavior and the API ignores it, so the database assigns the real numeric id.
