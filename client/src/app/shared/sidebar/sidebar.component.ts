import { Component, computed, inject } from '@angular/core';
import { UsersStore } from '../../users/state/users.store';

@Component({
    selector: 'app-sidebar',
    templateUrl: './sidebar.component.html',
})
export class SidebarComponent {
  private readonly store = inject(UsersStore);

  readonly usersCount = computed(() => this.store.users().length);
}
