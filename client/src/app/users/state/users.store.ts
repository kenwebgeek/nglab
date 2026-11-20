import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { User } from '../models/user.interface';
import { UsersService } from '../services/users.service';
import { SessionStore } from '../../auth/state/session.store';

export interface Notice {
  type: 'success' | 'error';
  message: string;
}

const SUCCESS_NOTICE_MS = 5000;
const NEW_USER_HIGHLIGHT_MS = 4000;

@Injectable({ providedIn: 'root' })
export class UsersStore {
  private readonly usersService = inject(UsersService);
  private readonly router = inject(Router);
  private readonly session = inject(SessionStore);

  private readonly _users = signal<ReadonlyArray<User>>([]);
  readonly users = this._users.asReadonly();

  private readonly _notice = signal<Notice | null>(null);
  // Outcome of the latest action; failed requests leave the users untouched
  readonly notice = this._notice.asReadonly();

  private readonly _newUserId = signal<number | null>(null);
  // Id of a just-created user, cleared after a short while so the list can highlight it
  readonly newUserId = this._newUserId.asReadonly();

  private noticeTimer?: ReturnType<typeof setTimeout>;
  private newUserTimer?: ReturnType<typeof setTimeout>;

  load() {
    this.usersService.getUsers().subscribe({
      next: (users) => this._users.set(users),
      error: () => this.showNotice('error', 'Unable to load users. Please try again.'),
    });
  }

  add(user: User) {
    this._notice.set(null);
    this.usersService.addUser(user).subscribe({
      next: (created) => {
        this._users.update((users) => [...users, created]);
        this.highlightNewUser(created.id);
        this.showNotice('success', `${this.fullName(created)} was added.`);
        this.router.navigate(['users']);
      },
      error: () => this.showNotice('error', 'Unable to add the user. Please try again.'),
    });
  }

  update(user: User, options: { navigateToUsers?: boolean } = {}) {
    this._notice.set(null);
    this.usersService.updateUser(user.id, user).subscribe({
      next: (updated) => {
        this._users.update((users) => users.map((data) => (data.id === updated.id ? updated : data)));
        if (this.session.user()?.id === updated.id) {
          this.session.setUser(updated);
        }
        this.showNotice('success', `${this.fullName(updated)} was updated.`);
        if (options.navigateToUsers !== false) {
          this.router.navigate(['users']);
        }
      },
      error: () => this.showNotice('error', 'Unable to update the user. Please try again.'),
    });
  }

  remove(id: number) {
    this._notice.set(null);
    const user = this._users().find((data) => data.id === id);
    this.usersService.deleteUserData(id).subscribe({
      next: () => {
        this._users.update((users) => users.filter((data) => data.id !== id));
        this.showNotice('success', `${user ? this.fullName(user) : 'The user'} was deleted.`);
      },
      error: () => this.showNotice('error', 'Unable to delete the user. Please try again.'),
    });
  }

  dismissNotice() {
    clearTimeout(this.noticeTimer);
    this._notice.set(null);
  }

  private showNotice(type: Notice['type'], message: string) {
    clearTimeout(this.noticeTimer);
    this._notice.set({ type, message });
    // Errors stay until dismissed or replaced
    if (type === 'success') {
      this.noticeTimer = setTimeout(() => this._notice.set(null), SUCCESS_NOTICE_MS);
    }
  }

  private highlightNewUser(id: number) {
    clearTimeout(this.newUserTimer);
    this._newUserId.set(id);
    this.newUserTimer = setTimeout(() => this._newUserId.set(null), NEW_USER_HIGHLIGHT_MS);
  }

  private fullName(user: User) {
    return `${user.firstName} ${user.lastName}`;
  }
}
