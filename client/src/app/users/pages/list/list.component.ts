import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { User } from '../../models/user.interface';
import { UsersStore } from '../../state/users.store';
import { UsersListComponent } from '../../components/users-list/users-list.component';
import { ConfirmDialogComponent } from 'src/app/shared/confirm-dialog/confirm-dialog.component';
import { SessionStore } from '../../../auth/state/session.store';

@Component({
    selector: 'app-list',
    templateUrl: './list.component.html',
    imports: [UsersListComponent, ConfirmDialogComponent, RouterOutlet]
})
export class ListComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(UsersStore);
  private readonly session = inject(SessionStore);

  readonly users = this.store.users;
  readonly currentUserId = computed(() => this.session.user()?.id ?? null);
  readonly displayedUsers = computed(() => {
    const currentUserId = this.currentUserId();
    const users = this.store.users();

    if (currentUserId === null) {
      return users;
    }

    const currentUserIndex = users.findIndex(user => user.id === currentUserId);
    if (currentUserIndex <= 0) {
      return users;
    }

    return [
      users[currentUserIndex],
      ...users.slice(0, currentUserIndex),
      ...users.slice(currentUserIndex + 1),
    ];
  });
  readonly newUserId = this.store.newUserId;

  // The form overlay is a child route; its `:id` marks the row being edited
  private readonly form = toSignal(
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => this.readForm()),
      startWith(this.readForm()),
    ),
    { requireSync: true },
  );
  // A failed save is shown inside the open form instead
  readonly notice = computed(() => {
    const notice = this.store.notice();
    return notice?.type === 'error' && this.form().open ? null : notice;
  });

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

  selectUser(user: User) {
    this.userToDelete.set(user);
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

  dismissNotice() {
    this.store.dismissNotice();
  }

  private readForm(): { open: boolean } {
    // The child's snapshot isn't set yet while this page is created mid-navigation
    const child = this.route.firstChild;
    return { open: !!child };
  }
}
