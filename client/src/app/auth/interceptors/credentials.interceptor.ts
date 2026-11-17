import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Injector, inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SessionStore } from '../state/session.store';

// Sends the session cookie to the API, and returns to the login page when the session has ended
export const credentialsInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith(environment.apiUrl)) {
    return next(request);
  }
  // Resolved lazily: SessionStore depends on HttpClient, which depends on this interceptor
  const injector = inject(Injector);
  const isAuthRequest = request.url.startsWith(`${environment.apiUrl}/auth/`);

  return next(request.clone({ withCredentials: true })).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && !isAuthRequest) {
        injector.get(SessionStore).clear();
        injector.get(Router).navigate(['/login']);
      }
      return throwError(() => error);
    }),
  );
};
