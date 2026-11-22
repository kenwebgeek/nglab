import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AlertsComponent } from '../../../shared/alerts/alerts.component';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password-page',
  templateUrl: './forgot-password-page.component.html',
  host: { class: 'flex w-full flex-col items-center gap-6' },
  imports: [ReactiveFormsModule, RouterLink, AlertsComponent],
})
export class ForgotPasswordPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
  });
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly sent = signal(false);

  requestReset(): void {
    this.form.controls.email.setValue(this.form.controls.email.value.trim());
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.submitting()) {
      return;
    }

    this.submitting.set(true);
    this.error.set(null);
    this.authService.requestPasswordReset(this.form.controls.email.value).subscribe({
      next: () => this.sent.set(true),
      error: () => {
        this.error.set('Unable to request a password reset. Please try again.');
      },
    }).add(() => this.submitting.set(false));
  }
}
