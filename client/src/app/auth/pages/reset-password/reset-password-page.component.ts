import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AlertsComponent } from '../../../shared/alerts/alerts.component';
import { AuthService } from '../../services/auth.service';
import { SessionStore } from '../../state/session.store';

const matchingPasswords: ValidatorFn = (form: AbstractControl): ValidationErrors | null =>
  form.get('confirmPassword')?.value === form.get('newPassword')?.value ? null : { mismatch: true };

@Component({
  selector: 'app-reset-password-page',
  templateUrl: './reset-password-page.component.html',
  host: { class: 'flex w-full flex-col items-center gap-6' },
  imports: [ReactiveFormsModule, RouterLink, AlertsComponent],
})
export class ResetPasswordPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly session = inject(SessionStore);
  private readonly route = inject(ActivatedRoute);

  readonly token = this.route.snapshot.queryParamMap.get('token') ?? '';
  readonly form = this.fb.nonNullable.group({
    newPassword: ['', [
      Validators.required,
      Validators.minLength(12),
      Validators.maxLength(128),
      Validators.pattern(/\d/),
      Validators.pattern(/[^A-Za-z0-9]/),
    ]],
    confirmPassword: ['', [Validators.required]],
  }, { validators: matchingPasswords });
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly resetComplete = signal(false);

  resetPassword(): void {
    if (!this.token) {
      this.error.set('This reset link is invalid or has expired. Request a new one.');
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.submitting()) {
      return;
    }

    this.submitting.set(true);
    this.error.set(null);
    this.authService.resetPassword({
      token: this.token,
      newPassword: this.form.controls.newPassword.value,
    }).subscribe({
      next: () => {
        this.session.clear();
        this.form.reset();
        this.resetComplete.set(true);
      },
      error: (error: unknown) => {
        this.error.set(
          error instanceof HttpErrorResponse && error.status === 400 && error.error?.error === 'invalid_reset_token'
            ? 'This reset link is invalid or has expired. Request a new one.'
            : 'Unable to reset your password. Please try again.',
        );
      },
    }).add(() => this.submitting.set(false));
  }
}
