import { Component, computed, effect, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SessionStore } from '../auth/state/session.store';
import { AlertsComponent } from '../shared/alerts/alerts.component';
import { UsersStore } from '../users/state/users.store';

@Component({
  selector: 'app-account',
  templateUrl: './account.component.html',
  host: { class: 'block min-h-full' },
  imports: [AlertsComponent, ReactiveFormsModule],
})
export class AccountComponent {
  private readonly fb = inject(FormBuilder);
  private readonly session = inject(SessionStore);
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
}
