import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { LoginRequest } from '../models/login-request.interface';
import { SignupRequest } from '../models/signup-request.interface';
import { AccountsService } from '../services/accounts.service';
import { AuthService } from '../services/auth.service';
import { SessionStore } from './session.store';

// State of the sign-up and login pages: only one of them is on screen at a time, so they share it
@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly accountsService = inject(AccountsService);
  private readonly authService = inject(AuthService);
  private readonly session = inject(SessionStore);
  private readonly router = inject(Router);

  private readonly _submitting = signal(false);
  readonly submitting = this._submitting.asReadonly();

  private readonly _error = signal<string | null>(null);
  // Outcome of the latest attempt; a failed request changes nothing else
  readonly error = this._error.asReadonly();

  private readonly _notice = signal<string | null>(null);
  // Shown on the login page after signing up
  readonly notice = this._notice.asReadonly();

  signUp(request: SignupRequest) {
    if (this._submitting()) {
      return;
    }
    this.begin();
    this.accountsService.createAccount(request).subscribe({
      next: () => {
        this._submitting.set(false);
        this._notice.set('Account created. Check your email to verify your address before logging in. If the email does not arrive, request another.');
        this.router.navigate(['/login']);
      },
      error: (error: unknown) => this.fail(this.errorMessage(error, 'Unable to create the account. Please try again.', {
        409: 'An account with this email already exists.',
      })),
    });
  }

  login(request: LoginRequest) {
    if (this._submitting()) {
      return;
    }
    this.begin();
    this.authService.login(request).subscribe({
      next: (user) => {
        this._submitting.set(false);
        this._notice.set(null);
        this.session.setUser(user);
        this.router.navigate(['/users']);
      },
      error: (error: unknown) => this.fail(
        error instanceof HttpErrorResponse && error.status === 403 && error.error?.error === 'email_unverified'
          ? 'Verify your email address before logging in. Request another verification email if needed.'
          : this.errorMessage(error, 'Unable to log in. Please try again.', {
            401: 'Incorrect email or password.',
          }),
      ),
    });
  }

  dismissError() {
    this._error.set(null);
  }

  dismissNotice() {
    this._notice.set(null);
  }

  private begin() {
    this._error.set(null);
    this._submitting.set(true);
  }

  private fail(message: string) {
    this._submitting.set(false);
    this._error.set(message);
  }

  private errorMessage(error: unknown, fallback: string, byStatus: Record<number, string>): string {
    const status = error instanceof HttpErrorResponse ? error.status : undefined;
    if (status === 429) {
      return 'Too many attempts. Please try again later.';
    }
    return (status !== undefined && byStatus[status]) || fallback;
  }
}
