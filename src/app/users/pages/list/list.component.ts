import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { skip } from 'rxjs';
import { User } from '../../models/user.interface';
import { UserActions } from '../../state/user.actions';
import { selectUsers } from '../../state/user.selectors';
import { ViewActions } from '../../enums/view-actions.enum';
import { AppState } from 'src/app/state/app.state';

@Component({
    selector: 'app-list',
    templateUrl: './list.component.html',
    standalone: false
})
export class ListComponent implements OnInit {
  // Select users slice of state
  usersData: ReadonlyArray<User> = [];
  users$ = this.store.select(selectUsers());

  headers: { headerName: string, fieldName: keyof User}[] = [
    { headerName: 'First name', fieldName: 'firstName' },
    { headerName: 'Last name', fieldName: 'lastName' },
    { headerName: 'Nickname', fieldName: 'nickname' },
    { headerName: 'Email', fieldName: 'email' },
    { headerName: 'Current activity', fieldName: 'currentActivity' },
  ];

  constructor(
    private router: Router,
    private store: Store<AppState>
  ) { }

  ngOnInit(): void {
    this.store.dispatch({ type: UserActions.GET_USER_LIST });
    this.users$.pipe(skip(1)).subscribe(data => this.usersData = data);
  }

  selectUser(data: { user: User, action: ViewActions }) {
    switch(data.action) {
      case ViewActions.View: {
        this.router.navigate(['users', 'manage', data.user.id]);
        console.log(`Routed user ${data.user.id} (${data.user.nickname}) to View/Edit form...`);
        return;
      }
      case ViewActions.Delete: {
        this.store.dispatch({ type: UserActions.REMOVE_USER_API, payload: data.user.id });
        return;
      }
      default: ''
    }
  }
}
