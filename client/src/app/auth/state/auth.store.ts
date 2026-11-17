import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SignupRequest } from '../models/signup-request.interface';
import { AccountsService } from '../services/accounts.service';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly accountsService = inject(AccountsService);
  private readonly router = inject(Router);

  private readonly _submitting = signal(false);
  readonly submitting = this._submitting.asReadonly();

  private readonly _error = signal<string | null>(null);
  // Outcome of the latest sign-up attempt; a failed request changes nothing else
  readonly error = this._error.asReadonly();

  signUp(request: SignupRequest) {
    if (this._submitting()) {
      return;
    }
    this._error.set(null);
    this._submitting.set(true);
    this.accountsService.createAccount(request).subscribe({
      next: () => {
        this._submitting.set(false);
        this.router.navigate(['/login']);
      },
      error: (error: unknown) => {
        this._submitting.set(false);
        this._error.set(this.signUpErrorMessage(error));
      },
    });
  }

  dismissError() {
    this._error.set(null);
  }

  private signUpErrorMessage(error: unknown): string {
    switch (error instanceof HttpErrorResponse ? error.status : undefined) {
      case 409:
        return 'An account with this email already exists.';
      case 429:
        return 'Too many attempts. Please try again later.';
      default:
        return 'Unable to create the account. Please try again.';
    }
  }
}
