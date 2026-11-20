import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { AuthService } from '../auth/services/auth.service';
import { SessionStore } from '../auth/state/session.store';
import { AlertsComponent } from '../shared/alerts/alerts.component';
import { UsersStore } from '../users/state/users.store';

type PasswordField = 'currentPassword' | 'newPassword' | 'confirmPassword';
type PasswordNotice = { type: 'success' | 'error', message: string };

const matchingPasswords: ValidatorFn = (form: AbstractControl): ValidationErrors | null =>
  form.get('confirmPassword')?.value === form.get('newPassword')?.value ? null : { mismatch: true };

@Component({
  selector: 'app-account',
  templateUrl: './account.component.html',
  host: { class: 'block min-h-full' },
  imports: [AlertsComponent, ReactiveFormsModule],
})
export class AccountComponent {
  private readonly fb = inject(FormBuilder);
  private readonly session = inject(SessionStore);
  private readonly authService = inject(AuthService);
  readonly usersStore = inject(UsersStore);

  readonly profileForm = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    lastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    nickname: ['', [Validators.maxLength(100)]],
    currentActivity: ['', [Validators.maxLength(200)]],
  });
  readonly notice = this.usersStore.notice;
  readonly signedInEmail = computed(() => this.session.user()?.email ?? '');
  readonly passwordForm = this.fb.nonNullable.group({
    currentPassword: ['', [Validators.required, Validators.maxLength(128)]],
    newPassword: ['', [
      Validators.required,
      Validators.minLength(12),
      Validators.maxLength(128),
      Validators.pattern(/\d/),
      Validators.pattern(/[^A-Za-z0-9]/),
    ]],
    confirmPassword: ['', [Validators.required]],
  }, { validators: matchingPasswords });
  readonly passwordSubmitting = signal(false);
  readonly passwordNotice = signal<PasswordNotice | null>(null);
  readonly visiblePasswordFields = signal<Record<PasswordField, boolean>>({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  constructor() {
    effect(() => {
      const user = this.session.user();
      if (user) {
        this.profileForm.reset({
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          nickname: user.nickname,
          currentActivity: user.currentActivity ?? '',
        });
      }
    });
  }

  saveProfile(): void {
    const user = this.session.user();
    if (!user) {
      return;
    }
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const value = this.profileForm.getRawValue();
    this.usersStore.update({
      id: user.id,
      firstName: value.firstName.trim(),
      lastName: value.lastName.trim(),
      email: value.email.trim(),
      nickname: value.nickname.trim(),
      currentActivity: value.currentActivity.trim(),
    }, { navigateToUsers: false });
  }

  resetProfile(): void {
    const user = this.session.user();
    if (user) {
      this.profileForm.reset({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        nickname: user.nickname,
        currentActivity: user.currentActivity ?? '',
      });
    }
  }

  showError(name: keyof typeof this.profileForm.controls): boolean {
    const control = this.profileForm.controls[name];
    return control.invalid && (control.dirty || control.touched);
  }

  togglePasswordVisibility(field: PasswordField): void {
    this.visiblePasswordFields.update(visibility => ({
      ...visibility,
      [field]: !visibility[field],
    }));
  }

  passwordIsVisible(field: PasswordField): boolean {
    return this.visiblePasswordFields()[field];
  }

  showPasswordError(field: PasswordField): boolean {
    const control = this.passwordForm.controls[field];
    const mismatch = field === 'confirmPassword' && this.passwordForm.hasError('mismatch');
    return (control.invalid || mismatch) && (control.dirty || control.touched);
  }

  updatePassword(): void {
    if (this.passwordSubmitting()) {
      return;
    }
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.passwordSubmitting.set(true);
    this.passwordNotice.set(null);
    const { currentPassword, newPassword } = this.passwordForm.getRawValue();
    this.authService.changePassword({ currentPassword, newPassword }).subscribe({
      next: () => {
        this.passwordForm.reset();
        this.visiblePasswordFields.set({
          currentPassword: false,
          newPassword: false,
          confirmPassword: false,
        });
        this.passwordSubmitting.set(false);
        this.passwordNotice.set({ type: 'success', message: 'Your password was updated.' });
      },
      error: (error: unknown) => {
        this.passwordSubmitting.set(false);
        const incorrectCurrentPassword =
          error instanceof HttpErrorResponse && error.status === 400 &&
          error.error?.error === 'invalid_current_password';
        this.passwordNotice.set({
          type: 'error',
          message: incorrectCurrentPassword
            ? 'Current password is incorrect.'
            : 'Unable to update your password. Please try again.',
        });
      },
    });
  }

  dismissPasswordNotice(): void {
    this.passwordNotice.set(null);
  }
}
