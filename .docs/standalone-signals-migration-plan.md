# Plan: remove NgModules and replace NgRx with Angular signals

## Current state

| Area | Today |
|---|---|
| Modules | `AppModule`, `UsersModule`, `UsersRoutingModule`, `AppRoutingModule` and `MaterialModule`. |
| Components | 7 non-standalone components, set to `standalone: false` by the v19 migration. |
| Bootstrap | `platformBrowserDynamic().bootstrapModule(AppModule)` in `src/main.ts`. |
| State | NgRx store, effects and devtools. There are 10 action types (4 of the 5 API actions are dispatched as raw `{type, payload}` objects), 1 reducer, 2 selectors and 5 effects. |
| Effects | They call `UsersService`, dispatch a "STATE" action on success, navigate to `/users` after add and update, and swallow errors with `EMPTY`. |
| Templates | Use `*ngIf`, `*ngFor` and `ngClass`, so they depend on `CommonModule`. |
| Dead code | `REMOVE_ALL_*` and the `forkJoin` delete-all, the `app.state.ts` `AppState`, and the unused `AlertsComponent` (its usage is commented out). |

## Target

- Standalone components, `bootstrapApplication` and `app.config.ts`, with a lazy-loaded `users.routes.ts`.
- A signal-based `UsersStore` service (`providedIn: 'root'`) in place of NgRx. Angular has no official store, and the framework's standard approach is signals in injectable services.
- No `@ngrx/*` dependencies.

## Phases

Each phase is verified with `ng build` and `ng test`, then we pause so the app can be tested before the next phase.

### Phase 0: baseline
Work on a dedicated branch (`standalone-signals-migration`) from a clean, committed tree so each phase is easy to review or revert.

### Phase 1: modules -> standalone (NgRx stays for now)
1. Run `ng generate @angular/core:standalone` in its three official stages, with a build between each.
   - Convert all components to standalone.
   - Remove the unnecessary NgModules.
   - Bootstrap with standalone APIs.
2. Replace `MaterialModule` with the specific Material modules each component imports, and delete the file.
3. Create `app.config.ts`:
   - `provideRouter` with the route tree (`''` -> `users`, `**` -> `users`) and `withComponentInputBinding()`.
   - `provideHttpClient()`, which also removes the duplicate `HttpClientModule` in the lazy module.
   - `provideZoneChangeDetection()` (already added in `main.ts`).
   - NgRx via `provideStore`, `provideEffects`, `provideStoreDevtools` and `provideState('userState', ...)`, put on the `users` route's `providers`.
4. Convert `users-routing.module.ts` to `users.routes.ts` and lazy-load it with `loadChildren: () => import('./users/users.routes')`.
5. Run `ng generate @angular/core:control-flow`. This turns `*ngIf`/`*ngFor` into `@if`/`@for` so templates no longer need `CommonModule`. Replace `ngClass` in `app.component.html` with a `[class]` binding.
6. Check whether `BrowserAnimationsModule` can be dropped. Material 21 should not need it, but confirm that menus and expansion panels still work.
7. Update the 6 specs: `imports: [Component]` replaces `declarations`.

### Phase 2: NgRx -> signals
1. Create `users/state/users.store.ts` as an `@Injectable({ providedIn: 'root' })` class:
   - `private readonly _users = signal<readonly User[]>([])`, with a public readonly `users`.
   - A `userById(id)` method that returns a `computed`.
   - Methods `load()`, `add(user)`, `update(user)` and `remove(id)`. Each calls `UsersService`, updates the signal on success, and navigates to `/users` after add and update, exactly as the effects do now.
   - Errors stay silent, as they are now.
2. `ListComponent`: inject the store, call `load()` in `ngOnInit`, and pass `store.users()` to `users-list`. This removes the `skip(1)` workaround and the manual subscription.
3. `FormComponent`: read the route `id` through a signal `input()` (component input binding) instead of `ActivatedRoute.snapshot`. Derive the user with `computed`. This also removes the subscription created in the constructor that is never unsubscribed. Keep `manage` and `manage/:id` behavior identical.
4. Rewrite the list and form specs with a stubbed `UsersStore` or `HttpTestingController`. Add a `users.store.spec.ts` covering load, add, update and remove.
5. Keep `UsersService` as is. It could later become `httpResource`, but that is a larger behavior change and is out of scope.

### Phase 3: cleanup
- Delete `user.actions.ts`, `user.reducers.ts`, `user.selectors.ts`, `user.effects.ts`, `app/state/app.state.ts`, and the unused `REMOVE_ALL` code.
- `npm uninstall @ngrx/store @ngrx/effects @ngrx/store-devtools`.
- Final `ng build` (checking bundle size, since roughly 30-40 kB less is expected), `ng test`, and a manual smoke test of list, create, edit and delete.

## Decisions (defaults in bold)

1. **State library:** **plain signals in a service**, versus NgRx SignalStore (keeps the NgRx dependency and its familiar patterns).
2. **Error handling:** **keep errors silent, as today**, versus adding an `error` signal and a message. Behavior stays unchanged during the migration, and error handling can be added afterward.
3. **Redux DevTools:** they go away after Phase 2. They can be kept only via NgRx SignalStore plus the community `@angular-architects/ngrx-toolkit` devtools.
4. **Scope:** no conversion of `@Input`/`@Output` to signal inputs and outputs, `constructor` injection to `inject()`, or forms to signal forms in this work. Those are separate steps with automated CLI migrations.
