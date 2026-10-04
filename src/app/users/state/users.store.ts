import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { User } from '../models/user.interface';
import { UsersService } from '../services/users.service';

@Injectable({ providedIn: 'root' })
export class UsersStore {
  private readonly usersService = inject(UsersService);
  private readonly router = inject(Router);

  private readonly _users = signal<ReadonlyArray<User>>([]);
  readonly users = this._users.asReadonly();

  // API errors are intentionally ignored, as they were in the NgRx effects
  load() {
    this.usersService.getUsers().subscribe({
      next: (users) => this._users.set(users),
      error: () => { },
    });
  }

  add(user: User) {
    this.usersService.addUser(user).subscribe({
      next: (created) => {
        this._users.update((users) => [...users, created]);
        this.router.navigate(['users']);
      },
      error: () => { },
    });
  }

  update(user: User) {
    this.usersService.updateUser(user.id, user).subscribe({
      next: () => {
        this._users.update((users) => users.map((data) => (data.id === user.id ? user : data)));
        this.router.navigate(['users']);
      },
      error: () => { },
    });
  }

  remove(id: number) {
    this.usersService.deleteUserData(id).subscribe({
      next: () => this._users.update((users) => users.filter((data) => data.id !== id)),
      error: () => { },
    });
  }
}
