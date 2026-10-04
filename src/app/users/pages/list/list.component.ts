import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { User } from '../../models/user.interface';
import { UsersStore } from '../../state/users.store';
import { ViewActions } from '../../enums/view-actions.enum';
import { UsersListComponent } from '../../components/users-list/users-list.component';

@Component({
    selector: 'app-list',
    templateUrl: './list.component.html',
    imports: [UsersListComponent]
})
export class ListComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly store = inject(UsersStore);

  readonly users = this.store.users;

  headers: { headerName: string, fieldName: keyof User}[] = [
    { headerName: 'First name', fieldName: 'firstName' },
    { headerName: 'Last name', fieldName: 'lastName' },
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
        this.store.remove(data.user.id);
        return;
      }
      default: ''
    }
  }
}
