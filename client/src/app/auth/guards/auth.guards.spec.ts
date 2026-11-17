import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { SessionStore } from '../state/session.store';
import { authGuard, guestGuard } from './auth.guards';

describe('auth guards', () => {
  const run = (guard: CanActivateFn, signedIn: boolean) => {
    TestBed.configureTestingModule({
      providers: [{ provide: SessionStore, useValue: { restore: () => of(signedIn) } }],
    });
    let result: boolean | UrlTree | undefined;
    const outcome = TestBed.runInInjectionContext(() =>
      guard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    ) as Observable<boolean | UrlTree>;
    outcome.subscribe(value => (result = value));
    return result;
  };
  const path = (result: boolean | UrlTree | undefined) => TestBed.inject(Router).serializeUrl(result as UrlTree);

  it('authGuard lets a signed-in user in', () => {
    expect(run(authGuard, true)).toBeTrue();
  });

  it('authGuard sends everyone else to /login', () => {
    expect(path(run(authGuard, false))).toBe('/login');
  });

  it('guestGuard lets a visitor see login and sign up', () => {
    expect(run(guestGuard, false)).toBeTrue();
  });

  it('guestGuard sends a signed-in user to /users', () => {
    expect(path(run(guestGuard, true))).toBe('/users');
  });
});
