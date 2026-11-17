import { Component, inject, input, output, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { AlertsComponent } from '../../../shared/alerts/alerts.component';
import { SignupRequest } from '../../models/signup-request.interface';

// Mirror the API's limits (accounts/validation.ts and users/validation.ts)
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const NAME_MIN_LENGTH = 2;
export const NAME_MAX_LENGTH = 100;

// The API trims names before validating them, so a name of spaces is missing and "A " is too short
function requiredName(control: AbstractControl<string>): ValidationErrors | null {
  const length = control.value.trim().length;
  if (length === 0) {
    return { required: true };
  }
  return length < NAME_MIN_LENGTH ? { minlength: { requiredLength: NAME_MIN_LENGTH, actualLength: length } } : null;
}

@Component({
    selector: 'app-signup-form',
    templateUrl: './signup-form.component.html',
    imports: [ReactiveFormsModule, AlertsComponent]
})
export class SignupFormComponent {
  private readonly fb = inject(FormBuilder);

  readonly submitting = input(false);
  // Set when creating the account fails, shown above the fields
  readonly errorMessage = input<string | null>(null);
  readonly submitted = output<SignupRequest>();
  readonly errorDismissed = output<void>();

  readonly passwordMinLength = PASSWORD_MIN_LENGTH;
  readonly nameMinLength = NAME_MIN_LENGTH;
  readonly nameMaxLength = NAME_MAX_LENGTH;
  readonly showPassword = signal(false);

  readonly signupForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    password: ['', [Validators.required, Validators.minLength(PASSWORD_MIN_LENGTH), Validators.maxLength(PASSWORD_MAX_LENGTH)]],
    firstName: ['', [requiredName, Validators.maxLength(NAME_MAX_LENGTH)]],
    lastName: ['', [requiredName, Validators.maxLength(NAME_MAX_LENGTH)]],
    nickname: ['', [Validators.maxLength(NAME_MAX_LENGTH)]],
  });

  get email() { return this.signupForm.controls.email; }
  get password() { return this.signupForm.controls.password; }
  get firstName() { return this.signupForm.controls.firstName; }
  get lastName() { return this.signupForm.controls.lastName; }

  showError(name: 'email' | 'password' | 'firstName' | 'lastName' | 'nickname') {
    const control = this.signupForm.controls[name];
    return control.invalid && (control.touched || control.dirty);
  }

  toggleShowPassword() {
    this.showPassword.update(shown => !shown);
  }

  onSubmit() {
    if (this.signupForm.invalid) {
      this.signupForm.markAllAsTouched();
      return;
    }
    if (this.submitting()) {
      return;
    }
    const { email, password, firstName, lastName, nickname } = this.signupForm.getRawValue();
    this.submitted.emit({
      email: email.trim(),
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      nickname: nickname.trim(),
    });
  }
}
