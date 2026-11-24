import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AlertsComponent } from '../../../shared/alerts/alerts.component';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-resend-verification',
  imports: [ReactiveFormsModule, RouterLink, AlertsComponent],
  templateUrl: './resend-verification.page.html',
  host: { class: 'flex w-full flex-col items-center gap-6' },
})
export class ResendVerificationPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  readonly form = this.fb.nonNullable.group({ email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]] });
  readonly submitting = signal(false);
  readonly sent = signal(false);
  readonly error = signal<string | null>(null);

  resend(): void {
    this.form.controls.email.setValue(this.form.controls.email.value.trim());
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.submitting()) return;
    this.submitting.set(true);
    this.error.set(null);
    this.auth.requestEmailVerification(this.form.controls.email.value).subscribe({
      next: () => this.sent.set(true),
      error: () => this.error.set('Unable to request a verification email. Please try again.'),
    }).add(() => this.submitting.set(false));
  }
}
