import { Component, computed, inject, viewChild } from '@angular/core';
import { ActivatedRoute, CanDeactivateFn, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { User } from '../../models/user.interface';
import { UsersStore } from '../../state/users.store';
import { UserFormComponent } from '../../components/user-form/user-form.component';
import { SessionStore } from '../../../auth/state/session.store';

@Component({
    selector: 'app-form',
    templateUrl: './form.component.html',
    imports: [UserFormComponent]
})
export class FormComponent {
  private readonly store = inject(UsersStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly session = inject(SessionStore);
  readonly userId = toSignal(this.route.paramMap.pipe(map(params => params.get('id'))), {
    initialValue: this.route.snapshot.paramMap.get('id'),
  });
  readonly selectedUser = computed(() => this.store.users().find(user => String(user.id) === this.userId()) ?? null);
  readonly showAdmin = computed(() => !this.userId() || this.selectedUser()?.id !== this.session.user()?.id);

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
    if (this.userId()) {
      if (!this.selectedUser()) {
        return;
      }
      if (!this.showAdmin()) {
        const { admin: _admin, ...profile } = user;
        this.store.update(profile);
      } else {
        this.store.update(user);
      }
    } else {
      this.store.add(user);
    }
  }
}

// Holds navigation until the overlay has finished animating out
export const playLeaveAnimation: CanDeactivateFn<FormComponent> = (component) =>
  component.animateOut().then(() => true);
