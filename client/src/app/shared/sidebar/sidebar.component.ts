import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { UsersStore } from '../../users/state/users.store';

@Component({
    selector: 'app-sidebar',
    templateUrl: './sidebar.component.html',
    imports: [RouterLink, RouterLinkActive],
})
export class SidebarComponent {
  private readonly store = inject(UsersStore);

  readonly usersCount = computed(() => this.store.users().length);
}
