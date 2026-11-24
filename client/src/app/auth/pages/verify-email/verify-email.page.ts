import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AlertsComponent } from '../../../shared/alerts/alerts.component';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-verify-email',
  imports: [RouterLink, AlertsComponent],
  templateUrl: './verify-email.page.html',
  host: { class: 'flex w-full flex-col items-center gap-6' },
})
export class VerifyEmailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  readonly status = signal<'pending' | 'verified' | 'invalid' | 'error'>('pending');

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.status.set('invalid');
      return;
    }
    this.auth.verifyEmail(token).subscribe({
      next: () => this.status.set('verified'),
      error: (error: unknown) => this.status.set(
        error instanceof HttpErrorResponse && error.status === 400 && error.error?.error === 'invalid_verification_token'
          ? 'invalid' : 'error',
      ),
    });
  }
}
