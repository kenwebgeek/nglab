import { Component, OnInit, computed, inject, input, viewChild } from '@angular/core';
import { CanDeactivateFn, Router } from '@angular/router';
import { User } from '../../models/user.interface';
import { UsersStore } from '../../state/users.store';
import { UserFormComponent } from '../../components/user-form/user-form.component';

@Component({
    selector: 'app-form',
    templateUrl: './form.component.html',
    imports: [UserFormComponent]
})
export class FormComponent implements OnInit {
  private readonly store = inject(UsersStore);
  private readonly router = inject(Router);

  // Bound from the `:id` route param
  readonly id = input<string>();

  private readonly userForm = viewChild.required(UserFormComponent);

  readonly user = computed(() => {
    const id = Number(this.id());
    return this.store.users().find(data => data.id === id) ?? null;
  });

  readonly error = computed(() => {
    const notice = this.store.notice();
    return notice?.type === 'error' ? notice.message : null;
  });

  ngOnInit(): void {
    // Direct visits to /manage/:id start with an empty store
    if (this.id() && !this.user()) {
      this.store.load();
    }
  }

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

  formAction(data: { value: User, action: string }) {
    console.log(data);
    switch (data.action) {
      case 'Create':
        this.store.add(data.value);
        break;
      case 'Update':
        this.store.update(data.value);
        break;
      default: '';
        break;
    }
  }
}

// Holds navigation until the overlay has finished animating out
export const playLeaveAnimation: CanDeactivateFn<FormComponent> = (component) =>
  component.animateOut().then(() => true);
