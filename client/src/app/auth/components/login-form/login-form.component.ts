import { Component, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AlertsComponent } from '../../../shared/alerts/alerts.component';
import { LoginRequest } from '../../models/login-request.interface';

@Component({
    selector: 'app-login-form',
    templateUrl: './login-form.component.html',
    imports: [ReactiveFormsModule, RouterLink, AlertsComponent]
})
export class LoginFormComponent {
  private readonly fb = inject(FormBuilder);

  readonly submitting = input(false);
  // Set when logging in fails, shown above the fields
  readonly errorMessage = input<string | null>(null);
  readonly submitted = output<LoginRequest>();
  readonly errorDismissed = output<void>();

  readonly showPassword = signal(false);

  readonly loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    // Only required: whether it is right is for the server to say
    password: ['', [Validators.required]],
  });

  get email() { return this.loginForm.controls.email; }

  showError(name: 'email' | 'password') {
    const control = this.loginForm.controls[name];
    return control.invalid && (control.touched || control.dirty);
  }

  toggleShowPassword() {
    this.showPassword.update(shown => !shown);
  }

  onSubmit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }
    if (this.submitting()) {
      return;
    }
    const { email, password } = this.loginForm.getRawValue();
    this.submitted.emit({ email: email.trim(), password });
  }
}
