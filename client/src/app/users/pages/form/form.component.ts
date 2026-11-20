import { Component, computed, inject, viewChild } from '@angular/core';
import { CanDeactivateFn, Router } from '@angular/router';
import { User } from '../../models/user.interface';
import { UsersStore } from '../../state/users.store';
import { UserFormComponent } from '../../components/user-form/user-form.component';

@Component({
    selector: 'app-form',
    templateUrl: './form.component.html',
    imports: [UserFormComponent]
})
export class FormComponent {
  private readonly store = inject(UsersStore);
  private readonly router = inject(Router);

  private readonly userForm = viewChild.required(UserFormComponent);

  readonly error = computed(() => {
    const notice = this.store.notice();
    return notice?.type === 'error' ? notice.message : null;
  });

  animateOut() {
    return this.userForm().animateOut();
  }

  closeForm() {
    // Drop a failed-save error so it doesn't reappear on the list
    if (this.error()) {
      this.store.dismissNotice();
    }
    this.router.navigate(['/users']);
  }

  createUser(user: User) {
    this.store.add(user);
  }
}

// Holds navigation until the overlay has finished animating out
export const playLeaveAnimation: CanDeactivateFn<FormComponent> = (component) =>
  component.animateOut().then(() => true);
