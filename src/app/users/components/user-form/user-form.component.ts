import { Component, computed, effect, input, output } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { User } from '../../models/user.interface';
import { MatCard } from '@angular/material/card';
import { RouterLink } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';

import { MatButton } from '@angular/material/button';

@Component({
    selector: 'app-user-form',
    templateUrl: './user-form.component.html',
    imports: [MatCard, RouterLink, MatIcon, ReactiveFormsModule, MatFormField, MatLabel, MatInput, MatError, MatButton]
})
export class UserFormComponent {
  readonly selectedUser = input<User | null>(null);
  readonly action = output<{ value: User, action: string }>();
  readonly actionButtonLabel = computed(() => this.selectedUser() ? 'Update' : 'Create');

  userForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.userForm = this.fb.group({
      firstName: ['', [
        Validators.required,
        Validators.minLength(2)
      ]],
      lastName: ['', [
        Validators.required,
        Validators.minLength(2)
      ]],
      nickname: [''],
      email: ['', [
        Validators.required,
        Validators.email
      ]],
      currentActivity: [''],
      id: [''],
    });

    // The selected user can arrive after the form is created (e.g. a direct visit while users load)
    effect(() => {
      const selectedUser = this.selectedUser();
      if (selectedUser) {
        this.userForm.patchValue(selectedUser);
      }
    });
  }

  emitAction() {
    this.action.emit({ value: this.userForm.value, action: this.actionButtonLabel() });
  }

  resetForm() {
    this.userForm.reset();
  }

  // Get form controls to use for form validation
  get firstName() {
    return this.userForm.get('firstName');
  }

  get lastName() {
    return this.userForm.get('lastName');
  }

  get email() {
    return this.userForm.get('email');
  }

}
