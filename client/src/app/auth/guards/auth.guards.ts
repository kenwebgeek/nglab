import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { SessionStore } from '../state/session.store';

// The signed-in application: anyone else goes to the login page
export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  return inject(SessionStore)
    .restore()
    .pipe(map((signedIn) => signedIn || router.createUrlTree(['/login'])));
};

// Login and sign-up: someone who is already signed in goes to the users list
export const guestGuard: CanActivateFn = () => {
  const router = inject(Router);
  return inject(SessionStore)
    .restore()
    .pipe(map((signedIn) => !signedIn || router.createUrlTree(['/users'])));
};
