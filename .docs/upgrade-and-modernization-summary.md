# Summary: Angular 15 -> 21 upgrade and modernization

The final state is a clean `ng build` with no warnings and 28 passing unit tests.

## Part 1: Version upgrades (15 -> 21)

We upgraded one major version at a time, so each step could be tested before the next. Each step covered Angular core and CLI, Material and CDK, and NgRx.

| Version | What the migrations changed |
|---|---|
| 16 | Dependencies only, with no code changes. |
| 17 | Renamed `browserTarget` to `buildTarget` in `angular.json`, escaped the `@` in the email error text, and added `connectInZone` to NgRx devtools. |
| 18 | Offered to swap `HttpClientModule` for `provideHttpClient`. |
| 19 | Added `standalone: false` to the 7 module-declared components, since components are standalone by default now. |
| 20 | Set `moduleResolution` to `bundler` and added schematics defaults to `angular.json`. |
| 21 | Added `provideZoneChangeDetection()` to `main.ts`, because v21 is zoneless by default. Also dropped the explicit `lib` setting. |

## Part 2: Build system and bundle size

- **Budget warning:** the initial bundle outgrew the default 500 kB budget (995 kB on Angular 21). The limit was first raised, then the project moved to the faster esbuild `application` builder. That cut the bundle to 854 kB.
- **Result:** after the later cleanup (Part 3), the final bundle is **511 kB**, and the budget is tightened to 600 kB warning / 800 kB error.

## Part 3: Modernization

The plan is in [standalone-signals-migration-plan.md](./standalone-signals-migration-plan.md).

1. **Standalone:** all NgModules are gone. The app now uses `app.config.ts`, `app.routes.ts` and a lazy-loaded `users.routes.ts`.
2. **Template syntax:** templates use `@if` and `@for`, and `ngClass` became a `[class]` binding.
3. **State management:** NgRx was replaced by a small signal-based `UsersStore` service. The old actions, reducer, selectors and effects are deleted.
4. **Cleanup:** `@angular/animations` and `@angular/platform-browser-dynamic` are removed as unused.
5. **Signals:** inputs and outputs moved to `input()` and `output()`, and `actionButtonLabel` and `headerFields` became computed values.
6. **Dependency injection:** constructors now use `inject()`.
7. **Zoneless:** `zone.js` is removed from the build and the app. The dark-mode state moved to signals so it still updates.

## Issues encountered and how they were resolved

- **Migration side effects:** some auto-migrations were unnecessary or harmful.
  - **HTTP provider:** the Angular 18 `HttpClientModule` migration would have registered a second HTTP provider in the lazy module. It was reverted.
  - **`@ngrx/operators`:** the NgRx 18 migration added it, but nothing used it. It was removed.
  - **Control-flow migration (v21):** it was reverted for the upgrade, then applied deliberately during the standalone work.
- **NgRx migration error:** from v19 onward, `ng update` for NgRx crashed with "Cannot find module '@angular-devkit/core'". The newer NgRx versions have no migrations to run, and `npm install` repaired the install each time.
- **Failing unit tests:** 8 of 10 tests failed after the v21 upgrade. They were default CLI test files that never supplied the providers their components need, and one used the removed `async()` helper. They were rewritten, then the suite was expanded to 28 tests, including the project's first store tests.
- **Tailwind error:** a "can't resolve `tailwindcss/plugin`" error was reported but could not be reproduced, because the module resolved fine. It was most likely a transient error from `ng update` wiping `node_modules` between steps. It didn't recur.
- **Node version:** the esbuild builder migration needs Node 22.22.3 or newer, and the shell was on Node 20. Node 22.23.3 from nvm was used.
- **Mismatched build package:** that migration also pulled in `@angular/build` v22, which doesn't match Angular 21. It was pinned to 21.
- **Page not scrolling:** the users list ran past the bottom of the page and couldn't scroll. An outer `overflow-hidden` wrapper around an inner `h-screen` div has clipped tall content since the dark-mode commit. The list was short enough before that nobody noticed. It was fixed by switching to `overflow-x-hidden` and `min-h-screen`.
- **Direct visit to `/users/manage/1`:** this showed an empty form. The users hadn't been loaded, and the form only filled itself once on init. It now loads the users when needed and updates when the user arrives.
- **Backend process killed:** while cleaning up a test server, the process on port 3000 (most likely the developer's `json-server`) was killed, and the list went empty until it was restarted. After that, only servers started by the assistant were stopped.

## Behavior changes to know about

- **Add user:** a newly added user now comes from the server's response, so it has its real id immediately, where before it kept the form's empty id until the list reloaded.
- **Redux DevTools:** they're gone along with NgRx.
- **Production output folder:** it moved to `dist/ng-lab/browser`.
- **Unused `AlertsComponent`:** it's still in the repo. Its alert and loading fields in `UsersListComponent` are plain fields, so make them signals if that feature is ever revived.
