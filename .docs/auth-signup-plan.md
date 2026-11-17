# Authentication, part 1: account creation (signup)

Design: Figma file `ratzr0n8mHi4im52CouWEg`, node `35:10` ("Angular Lab · Signup"). This is the first part of an
authentication and authorization system. Login, sessions and authorization come later.

## Decisions

1. **Credentials live in an `accounts` table** (`user_id` primary key and foreign key to `users.id`, `password_hash`,
   timestamps). The profile fields (email, first name, last name, nickname) live only in `users`, which already has their
   rules and a case-insensitive unique email. Signup inserts the user and the account in one transaction, so a new
   signup also appears in the Users list. Deleting a user deletes their account (`ON DELETE CASCADE`).
   *(Revised: the first version stored the email in `accounts` and collected only email and password.)*
2. **Passwords are hashed with Node's built-in `crypto.scrypt`**, with a per-password random salt and a constant-time
   comparison. No new dependency.
3. **`POST /accounts` returns `201` with the user shape `{ id, firstName, lastName, nickname, email }`** and the client redirects to `/login`. Sessions/JWT come with login.
4. **The app shell moves into a `ShellLayout` route component**, so `/signup` (and later `/login`) render in a separate
   `AuthLayout` without the sidebar and breadcrumb bar.

## Design summary

- Full-page layout: header (brand mark "A" + "Angular Lab", "User management" on the right), footer ("Help & support"),
  `#f5f7fb` background.
- 480px card: eyebrow "WORKSPACE ACCESS", title "Create your account", subtitle "Enter your details to create your
  account.", then in this order: Email * (hint "Your email is your username."), Password * (Show/Hide toggle), First
  name *, Last name *, Nickname (optional); a full-width indigo (`#4f46e5`) "Create account" button, and an "Already have
  an account? Log in" link.
- No image assets. The design has no error/loading states, so they are added following the existing store semantics.

## Phases

### 1. Database (`server/`)
- `accounts` table in `src/db/schema.ts` (`user_id` primary key referencing `users.id` with `ON DELETE CASCADE`, non-empty
  hash check).
- Drizzle migration in `server/drizzle/` plus an `updated_at` trigger reusing `set_updated_at()`. Migration `0005` drops and
  recreates the first version of `accounts` (it only held test data).

### 2. API (`server/`)
- `src/accounts/` with `password.ts`, `validation.ts`, `repository.ts` and `routes.ts`.
- `POST /accounts`: zod validation (the user rules for email, first name, last name and nickname, shared with
  `users/validation.ts`, plus a password of 8–128 characters), unknown keys stripped. The repository inserts the user and
  the account in one transaction and the route returns `201` with the user shape. Never return or log the hash or password.
- Unique violation on `users_email_unique` maps to `409 email_taken`.
- Mounted in `src/app.ts`; a stricter rate limit on this route.
- Bruno requests and Vitest tests (stored value is a hash, case-insensitive duplicate 409 including against an existing
  user, invalid body 400, the new user is listed by `GET /users`, rollback leaves no user behind, deleting a user deletes
  the account, no leaks in response or logs, DB constraints).

### 3. Client structure (`client/`)
- Lazy `auth` feature (`auth.routes.ts`) at `/signup`; `/login` is reserved for part two.
- `AuthLayoutComponent` (header, footer, centred content) and `ShellLayoutComponent` (current sidebar, breadcrumb bar and
  dark-mode toggle moved out of `AppComponent`).
- `AccountsService` (`POST /accounts`, returns a `User`) and a root `AuthStore` following the `UsersStore` failure semantics (state untouched
  on error; 409 shows an "email already in use" message, other errors a generic notice).

### 4. Signup template (`client/`)
- `SignupPageComponent` (coordinates store and routing) and `SignupFormComponent` (reactive form, signal inputs/outputs,
  Angular Material fields plus Tailwind, `dark:` variants).
- Email: required, valid format, hint text. Password: required, minimum length, Show/Hide toggle. First and last name:
  required, 2–100 characters. Nickname: optional, up to 100 characters. Submit disabled while submitting. "Log in" is a `routerLink` to `/login`.

### 5. Tests and verification
- Specs for the form, store (`HttpTestingController`) and page; `npm test -- --watch=false`, `npm run build`,
  `npm run api:test`.
- Run the stack and compare `/signup` to the Figma screenshot in light and dark.

## Out of scope (part two)
Login, sessions or tokens, route guards, password reset, email verification.

## Status

Implemented and verified: API tests, client tests, production build, and a manual signup through `/signup` against the
dev stack. Revision 2 (first name, last name and nickname added to the design) is included.

Differences from the plan above:
- The form uses plain Tailwind-styled inputs, like `UserFormComponent`, rather than `mat-form-field`.
- A root `ThemeStore` (`client/src/app/shared/theme/`) holds the dark-mode flag, so both layouts follow the `dark` class on the root template.
- `/login` does not exist yet: after a successful signup the app navigates to `/login`, which the `**` route sends to `/users` until part two.
- The signup rate limit is `express-rate-limit` (10 per client per 15 minutes), injectable through `AppDependencies.signupRateLimit` so tests are not throttled.
- Name fields are validated on the client after trimming (a name of spaces counts as missing), because the API trims before validating.
- The 409 message is shared with the Users form ("This email is already registered"); the client shows its own text.
