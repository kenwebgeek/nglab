import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { User } from '../../models/user.interface';
import { UsersStore } from '../../state/users.store';
import { ViewActions } from '../../enums/view-actions.enum';
import { UsersListComponent } from '../../components/users-list/users-list.component';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';

@Component({
    selector: 'app-list',
    templateUrl: './list.component.html',
    imports: [UsersListComponent, ConfirmDialogComponent]
})
export class ListComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly store = inject(UsersStore);

  readonly users = this.store.users;

  // The user awaiting delete confirmation; null while the prompt is closed
  readonly userToDelete = signal<User | null>(null);
  readonly deleteMessage = computed(() => {
    const user = this.userToDelete();
    return user
      ? `Are you sure you want to delete ${user.firstName} ${user.lastName}? This action cannot be undone.`
      : '';
  });

  headers: { headerName: string, fieldName: keyof User}[] = [
    { headerName: 'Nickname', fieldName: 'nickname' },
    { headerName: 'Email', fieldName: 'email' },
    { headerName: 'Current activity', fieldName: 'currentActivity' },
  ];

  ngOnInit(): void {
    this.store.load();
  }

  selectUser(data: { user: User, action: ViewActions }) {
    switch(data.action) {
      case ViewActions.View: {
        this.router.navigate(['users', 'manage', data.user.id]);
        console.log(`Routed user ${data.user.id} (${data.user.nickname}) to View/Edit form...`);
        return;
      }
      case ViewActions.Delete: {
        this.userToDelete.set(data.user);
        return;
      }
      default: ''
    }
  }

  confirmDelete() {
    const user = this.userToDelete();
    if (user) {
      this.store.remove(user.id);
    }
    this.userToDelete.set(null);
  }

  cancelDelete() {
    this.userToDelete.set(null);
  }
}
