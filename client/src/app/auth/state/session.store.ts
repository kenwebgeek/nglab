import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, map, of, shareReplay, tap } from 'rxjs';
import { User } from '../../users/models/user.interface';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  private readonly _user = signal<User | null>(null);
  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);

  // Whether the server has been asked who is signed in (after a reload the cookie may still be valid)
  private restored = false;
  private restoring?: Observable<boolean>;

  // Resolves to whether someone is signed in, asking the server only the first time
  restore(): Observable<boolean> {
    if (this.restored) {
      return of(this.isAuthenticated());
    }
    this.restoring ??= this.authService.currentUser().pipe(
      tap((user) => this.setUser(user)),
      map(() => true),
      catchError(() => {
        this.clear();
        return of(false);
      }),
      finalize(() => (this.restoring = undefined)),
      shareReplay(1),
    );
    return this.restoring;
  }

  setUser(user: User) {
    this.restored = true;
    this._user.set(user);
  }

  // Forgets the user here only; use logout() to end the session on the server too
  clear() {
    this.restored = true;
    this._user.set(null);
  }

  // Best effort: the user is signed out here even if the request fails, and an expired session is already gone
  logout() {
    this.authService.logout().subscribe({
      complete: () => this.finishLogout(),
      error: () => this.finishLogout(),
    });
  }

  private finishLogout() {
    this.clear();
    this.router.navigate(['/login']);
  }
}
